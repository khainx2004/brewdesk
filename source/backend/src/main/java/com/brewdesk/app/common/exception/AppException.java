package com.brewdesk.app.common.exception;

import lombok.Getter;

/** Lỗi nghiệp vụ có mã. Service ném ra, GlobalExceptionHandler dịch sang HTTP response. */
@Getter
public class AppException extends RuntimeException {

    private final ErrorCode errorCode;

    public AppException(ErrorCode errorCode) {
        super(errorCode.getDefaultMessage());
        this.errorCode = errorCode;
    }

    public AppException(ErrorCode errorCode, String message) {
        super(message);
        this.errorCode = errorCode;
    }
}
