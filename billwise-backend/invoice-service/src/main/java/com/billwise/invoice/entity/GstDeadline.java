package com.billwise.invoice.entity;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;
import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.mapping.Document;

import java.time.LocalDate;

@Document(collection = "gst_deadlines")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
public class GstDeadline {

    @Id
    private String id;

    @NotBlank
    private String formName;

    @NotBlank
    private String title;

    private String frequency;

    @NotNull
    private LocalDate dueDate;

    private String status = "Upcoming";

    private String description;

    private Integer lateFeePerDay = 50;

    private Integer maxPenalty = 10000;

    private String impact;
}
