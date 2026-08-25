export function evaluarRecordatorioComprobante(comprobante) {
  if (!comprobante || comprobante.estado_comprobante === 'pendiente') {
    return {
      activo: true,
      variant: 'warning',
      mensaje: 'Aún falta subir tu comprobante de pago para completar la inscripción.',
    };
  }

  if (comprobante.estado_comprobante === 'rechazado') {
    return {
      activo: true,
      variant: 'error',
      mensaje: 'Tu comprobante de pago fue rechazado. Debes subir uno nuevo.',
      detalle: comprobante.comentarios_revision,
    };
  }

  return { activo: false };
}

export function evaluarRecordatorioArchivo(archivos, etiqueta = 'soporte de categoría') {
  const ultimoArchivo = archivos?.[0];

  if (!ultimoArchivo || ultimoArchivo.estado === 'pendiente') {
    return {
      activo: true,
      variant: 'warning',
      mensaje: `Aún falta subir tu ${etiqueta} para completar la inscripción.`,
    };
  }

  if (ultimoArchivo.estado === 'rechazado') {
    return {
      activo: true,
      variant: 'error',
      mensaje: `Tu ${etiqueta} fue rechazado. Debes subir uno nuevo.`,
      detalle: ultimoArchivo.comentarios,
    };
  }

  return { activo: false };
}
