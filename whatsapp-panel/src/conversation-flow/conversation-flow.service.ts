import { Injectable, Logger, Inject, forwardRef } from '@nestjs/common';
import { DataSource, Repository } from 'typeorm';
import { InjectRepository } from '@nestjs/typeorm';
import { Chat } from '../chat/entities/chat.entity';
import { RedisStateStore } from './redis-state-store';
import { AiService } from '../ai/ai.service';
import { ConversationStep } from './conversation-state.enum';
import { UserState } from './conversation-flow.interface';
import { SurveyResponse, SurveyRating } from '../chat/entities/survey-response.entity';
import { ChatGateway } from '../chat/chat.gateway';

function interpolate(text: string, context: { [key: string]: any }): string {
  if (!text) return '';
  let result = text;
  if (context.userName) result = result.replace(/\$\{context\.userName\}/g, context.userName);
  if (context.clientName) result = result.replace(/\$\{context\.clientName\}/g, context.clientName);
  if (context.idNumber) result = result.replace(/\$\{context\.idNumber\}/g, context.idNumber);
  if (context.deudas_formateadas) result = result.replace(/\$\{context\.deudas_formateadas\}/g, context.deudas_formateadas);
  return result;
}

@Injectable()
export class ConversationFlowService {
  private readonly logger = new Logger(ConversationFlowService.name);

  constructor(
    @InjectRepository(SurveyResponse)
    private readonly surveyResponseRepo: Repository<SurveyResponse>,
    @Inject(forwardRef(() => ChatGateway))
    private readonly chatGateway: ChatGateway,
    private readonly redisStore: RedisStateStore,
    private readonly dataSource: DataSource,
    private readonly aiService: AiService,
  ) { }

  public async handleIncomingMessage(chat: Chat, rawText: string): Promise<string> {
    const contactNumber = chat.contactNumber;
    let userState = await this.redisStore.getUserState(contactNumber);
    const freshChat = await this.dataSource.getRepository(Chat).findOneBy({ id: chat.id });
    const text = rawText.trim();
    const context = { userName: freshChat.customerName };
    let responseText = '';

    if (userState.step === ConversationStep.SURVEY) {
      responseText = await this.handleSurvey(chat, text);
      return interpolate(responseText, context);
    }

    try {
      const globalAiResponse = await this.aiService.getNaturalResponse(userState.step, text, context);

      if (globalAiResponse.intent === 'despedida') {
        userState.step = ConversationStep.SURVEY;
        await this.redisStore.setUserState(contactNumber, userState);
        return this.getSurveyQuestion();
      }

      switch (userState.step) {
        case ConversationStep.START:
          if (!freshChat.customerName) {
            userState.step = ConversationStep.ASK_FOR_NAME;
            responseText = '¡Hola! Soy Kika 🤖, su asistente virtual.\nPara comenzar y darle una atención más personalizada, ¿me podría decir su nombre?';
          } else {
            userState.step = ConversationStep.MAIN_MENU;
            const initResponse = await this.aiService.getNaturalResponse(userState.step, 'saludo', context);
            responseText = initResponse.responseText;
          }
          break;

        case ConversationStep.ASK_FOR_NAME:
          responseText = await this.handleCustomerName(freshChat, rawText, userState);
          break;

        default:
          const aiResponse = globalAiResponse;
          responseText = aiResponse.responseText;

          switch (aiResponse.intent) {
            case 'consultar_deuda':
              if (userState.termsAccepted) {
                userState.step = ConversationStep.PEDIR_CEDULA;
                const cedulaResponse = await this.aiService.getNaturalResponse(ConversationStep.DISCLAIMER, 'aceptar', context);
                responseText = cedulaResponse.responseText;
              } else {
                userState.step = ConversationStep.DISCLAIMER;
              }
              break;

            case 'aceptar':
              if (userState.step === ConversationStep.DISCLAIMER) {
                userState.step = ConversationStep.PEDIR_CEDULA;
                userState.termsAccepted = true;
              }
              break;

            case 'volver_menu':
            case 'rechazar':
              userState.step = ConversationStep.MAIN_MENU;
              const rejectionResponse = await this.aiService.getNaturalResponse(userState.step, 'accion_sistema_menu_principal', context);
              responseText = rejectionResponse.responseText;
              break;

            case 'proveer_cedula':
              if (userState.step === ConversationStep.PEDIR_CEDULA) {
                responseText = await this.handleIdValidationAndDebtCheck(text, chat);
                userState.step = ConversationStep.MAIN_MENU;
              }
              break;

            case 'hablar_con_agente':
              return '__ACTIVATE_CHAT_WITH_ADVISOR__';
            default:
              break;
          }
          break;
      }

      await this.redisStore.setUserState(contactNumber, userState);
      return interpolate(responseText, context);

    } catch (error) {
      this.logger.error(`Fallo en el servicio de IA para el chat ${chat.id}. Transfiriendo a un agente.`, error);

      const fallbackMessage = 'Hola 👋, gracias por tu mensaje. En este momento KIKA esta tardando en responder, pero un asesor se pondrá en contacto contigo lo más pronto posible 😊.';


      return `${fallbackMessage}|__ACTIVATE_CHAT_WITH_ADVISOR__`;
    }
  }
  public async getHumanHandoffMessage(context: { [key: string]: any } = {}): Promise<string> {
    const aiResponse = await this.aiService.getNaturalResponse(ConversationStep.TRANSFERIR_AGENTE, 'accion_sistema_transferencia_humana', context);
    return interpolate(aiResponse.responseText, context);
  }

  private getSurveyQuestion(): string {
    return 'Antes de irte, ¿me ayudas con algo? 🧡\n\n¿Cómo te pareció mi atención hoy?\n1️⃣ Mala 😞\n2️⃣ Regular 😐\n3️⃣ ¡Excelente! 😄\n\nEscribe el número de tu respuesta o cualquier otro comentario que tengas.';
  }

  private async handleSurvey(chat: Chat, text: string): Promise<string> {
    const choice = text.trim().toLowerCase();
    let rating: SurveyRating | null = null;
    let comment: string | null = null;
    if (choice.includes('1') || choice.includes('mala')) rating = SurveyRating.MALA;
    else if (choice.includes('2') || choice.includes('regular')) rating = SurveyRating.REGULAR;
    else if (choice.includes('3') || choice.includes('excelente')) rating = SurveyRating.EXCELENTE;
    else comment = text;
    if (rating) {
      const surveyData = this.surveyResponseRepo.create({ chat, rating, comment });
      await this.surveyResponseRepo.save(surveyData);
      this.logger.log(`Encuesta guardada para el chat #${chat.id}`);
      this.chatGateway.broadcastDashboardUpdate();
    } else if (comment) {
      this.logger.log(`Comentario de encuesta guardado: ${comment}`);
    }

    // ¡CRÍTICO! Se resetea el estado ANTES de dar la respuesta final.
    await this.redisStore.resetUserState(chat.contactNumber);

    const finalResponse = await this.aiService.getNaturalResponse(ConversationStep.SURVEY, 'accion_sistema_agradecer_encuesta', { userName: chat.customerName });
    return finalResponse.responseText;
  }

  private async handleCustomerName(chat: Chat, rawText: string, userState: UserState): Promise<string> {
    const name = rawText.trim();
    if (!name || name.length < 3 || name.length > 40 || /\d/.test(name)) {
      return 'Por favor, ingrese un nombre y apellido válidos.';
    }
    chat.customerName = name;
    await this.dataSource.getRepository(Chat).save(chat);
    userState.step = ConversationStep.MAIN_MENU;
    const response = await this.aiService.getNaturalResponse(userState.step, "saludo", { userName: name });
    return response.responseText;
  }

  private async handleIdValidationAndDebtCheck(idNumber: string, chat: Chat): Promise<string> {
    const client = await this.findClientById(idNumber);
    if (!client) {
      this.logger.log(`Cliente no encontrado en la base de datos para la cédula: ${idNumber}`);
      const response = await this.aiService.getNaturalResponse(ConversationStep.MAIN_MENU, "accion_sistema_cliente_no_encontrado", { idNumber });
      return interpolate(response.responseText, { idNumber });
    }
    const deudasTexto = await this.mostrarListaEmpresas(idNumber);
    const context = { userName: chat.customerName, clientName: client.nombre, deudas_formateadas: deudasTexto };
    if (deudasTexto.includes("¡Buenas noticias!")) {
      const response = await this.aiService.getNaturalResponse(ConversationStep.MAIN_MENU, "accion_sistema_sin_deudas", context);
      return interpolate(response.responseText, context);
    }
    const response = await this.aiService.getNaturalResponse(ConversationStep.MAIN_MENU, "accion_sistema_deudas_encontradas", context);
    return interpolate(response.responseText, context);
  }

  private async findClientById(id: string) {
    try {
      const query = 'SELECT "id", "cedula", "nombre" FROM "cb_car_cliente" WHERE "cedula" = $1';
      const result = await this.dataSource.query(query, [id]);
      return result.length > 0 ? result[0] : null;
    } catch (error) { this.logger.error('Error consultando identificación:', error); return null; }
  }

  private async mostrarListaEmpresas(id: string): Promise<string> {
    try {
      const query = 'SELECT cc.id, cc.carterapropia, ccc2.descripcion ' +
        'FROM cb_car_cliente ccc ' +
        'JOIN cb_car_cliente_contratocobranza cccc ON ccc.id = cccc.cb_car_cliente_id ' +
        'JOIN contratocobranza cc ON cccc.listacontratocobranza_id = cc.id ' +
        'JOIN cb_car_cartera ccc2 ON cc.carteracb_id = ccc2.id ' +
        'WHERE ccc.cedula = $1 AND cc.cubre = false AND cc.antiguo = false';

      const rows = await this.dataSource.query(query, [id]);
      if (rows.length === 0) {
        return `¡Buenas noticias! No encontré deudas pendientes registradas para la identificación ${id}.`;
      }
      let respuesta = "";
      for (const row of rows) {
        respuesta += await this.obtenerDetalleDeuda(row);
      }
      return respuesta;
    } catch (error) { this.logger.error(`Error en mostrarListaEmpresas: ${error.message}`); return 'Ocurrió un error al consultar sus deudas.'; }
  }

  private async obtenerDetalleDeuda(deuda: any): Promise<string> {
    try {
      const contratoId = deuda.id;
      const carteraPropia = deuda.carterapropia;
      let mensaje = `Deuda con *${this.mapEncabezado(deuda.descripcion)}*:\n`;
      let foundDetails = false;
      if (carteraPropia) {
        const query = 'SELECT d.valorpagado AS valor_liquidacion, d.valortotaldeuda, p.descripcion ' +
          'FROM contratocobranza cc ' +
          'JOIN contratocobranza_datoscobranza cd ON cc.id = cd.contratocobranza_id ' +
          'JOIN datoscobranza d ON cd.datoscobranzas_id = d.id ' +
          'JOIN productocobranza p ON d.productocobranza_id = p.id ' +
          'WHERE cc.id = $1 AND cc.carterapropia = true';
        const result = await this.dataSource.query(query, [contratoId]);
        if (result.length > 0) {
          foundDetails = true;
          for (const r of result) {
            mensaje += ` - Producto: ${r.descripcion || 'No especificado'}\n`;
            mensaje += ` - Valor Total: $${Number(r.valortotaldeuda).toFixed(2)}\n\n`;
            mensaje += ` - Valor Liquidación por este mes: $${Number(r.valor_liquidacion).toFixed(2)}\n\n`;

          }
        }
      } else {
        const now = new Date();
        const mesAnio = `${String(now.getMonth() + 1).padStart(2, '0')}-${now.getFullYear()}`;
        const query = 'SELECT d.pagominimo, p.descripcion ' +
          'FROM contratocobranza cc ' +
          'JOIN contratocobranza_datoscobranza cd ON cc.id = cd.contratocobranza_id ' +
          'JOIN datoscobranza d ON cd.datoscobranzas_id = d.id ' +
          'JOIN productocobranza p ON d.productocobranza_id = p.id ' +
          'WHERE cc.id = $1 AND cc.carterapropia = false and cc.antiguo = false';
        const result = await this.dataSource.query(query, [contratoId]);
        if (result.length > 0) {
          foundDetails = true;
          for (const r of result) {
            mensaje += ` - Producto: ${r.descripcion || 'No especificado'}\n`;
            mensaje += ` - Valor deuda (mes actual): $${Number(r.pagominimo).toFixed(2)}\n\n`;
          }
        }
      }
      return foundDetails ? mensaje : `No se encontraron detalles para la deuda con *${this.mapEncabezado(deuda.descripcion)}* en el período actual.\n\n`;
    } catch (error) { this.logger.error(`Error en obtenerDetalleDeuda: ${error.message}`); return 'Ocurrió un problema al consultar el detalle de esta deuda.\n'; }
  }

  private mapEncabezado(desc: string): string {
    const d = (desc || '').toUpperCase();
    if (d.includes('BANCO DEL AUSTRO')) return 'BANCO DEL AUSTRO';
    if (d.includes('PACIFICO')) return 'BANCO DEL PACIFICO';
    if (d.includes('GUAYAQUIL')) return 'BANCO DE GUAYAQUIL';
    if (d.includes('PICHINCHA')) return 'BANCO PICHINCHA';
    if (d.includes('COOP SANTA')) return 'COOP SANTA ROSA';
    if (d.includes('EL BOSQUE')) return 'MUEBLES EL BOSQUE';
    if (d.includes('JAHER')) return 'JAHER';
    if (d.includes('MARCIMEX')) return 'MARCIMEX';
    if (d.includes('MASTER MOTO')) return 'MASTER MOTO';
    return desc || 'EMPRESA';
  }
}