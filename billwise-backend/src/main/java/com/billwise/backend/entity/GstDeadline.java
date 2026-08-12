package com.billwise.backend.entity;

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

    private String formName;
    private String title;
    private String frequency;
    private LocalDate dueDate;

    // "Upcoming" | "Optional" | "Scheduled" | "Overdue"
    private String status;

    private String description;

    private Integer lateFeePerDay;
    private Integer maxPenalty;

    private String impact;
}
