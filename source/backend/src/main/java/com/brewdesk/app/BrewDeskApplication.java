package com.brewdesk.app;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.boot.context.properties.ConfigurationPropertiesScan;

@SpringBootApplication
@ConfigurationPropertiesScan
public class BrewDeskApplication {

	public static void main(String[] args) {
		SpringApplication.run(BrewDeskApplication.class, args);
	}

}
