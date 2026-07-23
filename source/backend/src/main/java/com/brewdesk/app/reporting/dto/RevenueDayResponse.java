package com.brewdesk.app.reporting.dto;

import java.math.BigDecimal;
import java.time.LocalDate;

/** Doanh thu một ngày, cho biểu đồ. */
public record RevenueDayResponse(LocalDate date, BigDecimal revenue, long orderCount) {}
