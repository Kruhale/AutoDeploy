package com.autodeploy;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.scheduling.annotation.EnableScheduling;

@SpringBootApplication
@EnableScheduling
public class AutoDeployApplication {

    public static void main(String[] args) {
        SpringApplication.run(AutoDeployApplication.class, args);
    }
}
