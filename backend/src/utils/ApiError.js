// Error con codigo HTTP para que el manejador central sepa que responder.
export default class ApiError extends Error {
  constructor(status, message, details) {
    super(message);
    this.status = status;
    this.details = details;
    this.expose = true; // true = mensaje seguro de mostrar al cliente
  }

  static badRequest(msg, details) { return new ApiError(400, msg, details); }
  static unauthorized(msg = 'No autenticado') { return new ApiError(401, msg); }
  static forbidden(msg = 'No autorizado') { return new ApiError(403, msg); }
  static notFound(msg = 'No encontrado') { return new ApiError(404, msg); }
  static conflict(msg) { return new ApiError(409, msg); }
}
