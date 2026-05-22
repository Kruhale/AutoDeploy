package com.autodeploy.exception;

import com.autodeploy.dto.ErrorResponse;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.security.authentication.AuthenticationCredentialsNotFoundException;
import org.springframework.validation.ObjectError;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;
import org.springframework.web.servlet.resource.NoResourceFoundException;

import java.util.List;

@RestControllerAdvice
public class GlobalExceptionHandler {

    private static final Logger LOGGER = LoggerFactory.getLogger(GlobalExceptionHandler.class);

    @ExceptionHandler(ResourceNotFoundException.class)
    public ResponseEntity<ErrorResponse> handleResourceNotFound(ResourceNotFoundException ex) {
        ErrorResponse respuestaDeError = ErrorResponse.of("RESOURCE_NOT_FOUND", ex.getMessage());
        return ResponseEntity.status(HttpStatus.NOT_FOUND).body(respuestaDeError);
    }

    // Cuando ninguna ruta coincide con la URL, devolvemos 404 en vez del 500 por defecto
    @ExceptionHandler(NoResourceFoundException.class)
    public ResponseEntity<ErrorResponse> handleNoResourceFound(NoResourceFoundException ex) {
        ErrorResponse respuestaDeError = ErrorResponse.of("ROUTE_NOT_FOUND", "Ruta no encontrada: " + ex.getResourcePath());
        return ResponseEntity.status(HttpStatus.NOT_FOUND).body(respuestaDeError);
    }

    @ExceptionHandler(BadRequestException.class)
    public ResponseEntity<ErrorResponse> handleBadRequest(BadRequestException ex) {
        ErrorResponse respuestaDeError = ErrorResponse.of("BAD_REQUEST", ex.getMessage());
        return ResponseEntity.badRequest().body(respuestaDeError);
    }

    @ExceptionHandler(MethodArgumentNotValidException.class)
    public ResponseEntity<ErrorResponse> handleValidationError(MethodArgumentNotValidException ex) {
        List<ObjectError> listaDeErrores = ex.getBindingResult().getAllErrors();
        String mensajeDeError = "Error de validacion";
        if (!listaDeErrores.isEmpty()) {
            mensajeDeError = listaDeErrores.get(0).getDefaultMessage();
        }

        ErrorResponse respuestaDeError = ErrorResponse.of("VALIDATION_ERROR", mensajeDeError);
        return ResponseEntity.status(HttpStatus.UNPROCESSABLE_ENTITY).body(respuestaDeError);
    }

    // Cuando @PreAuthorize falla, Spring Security lanza AccessDeniedException: devolvemos 403
    @ExceptionHandler(AccessDeniedException.class)
    public ResponseEntity<ErrorResponse> handleAccessDenied(AccessDeniedException ex) {
        ErrorResponse respuestaDeError = ErrorResponse.of("ACCESS_DENIED", "No tienes permiso para acceder a este recurso");
        return ResponseEntity.status(HttpStatus.FORBIDDEN).body(respuestaDeError);
    }

    // Si llega una peticion sin credenciales a un endpoint protegido: 401
    @ExceptionHandler(AuthenticationCredentialsNotFoundException.class)
    public ResponseEntity<ErrorResponse> handleSinCredenciales(AuthenticationCredentialsNotFoundException ex) {
        ErrorResponse respuestaDeError = ErrorResponse.of("UNAUTHORIZED", "Faltan credenciales de autenticacion");
        return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(respuestaDeError);
    }

    @ExceptionHandler(Exception.class)
    public ResponseEntity<ErrorResponse> handleGenericError(Exception ex) {
        LOGGER.error("Excepcion no controlada: {}", ex.getMessage(), ex);
        ErrorResponse respuestaDeError = ErrorResponse.of("INTERNAL_ERROR", "Error interno del servidor");
        return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(respuestaDeError);
    }
}
