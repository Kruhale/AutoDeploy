package com.autodeploy.dto;

import java.time.LocalDateTime;

public record ErrorResponse(String error, String message, String timestamp) {

    public static ErrorResponse of(String error, String message) {
        return new ErrorResponse(error, message, LocalDateTime.now().toString());
    }
}
