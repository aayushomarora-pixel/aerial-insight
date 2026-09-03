CREATE TABLE `analyses` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`imageKey` varchar(512) NOT NULL,
	`imageUrl` varchar(768) NOT NULL,
	`fileName` varchar(255) NOT NULL,
	`prompt` text NOT NULL,
	`reportJson` text NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `analyses_id` PRIMARY KEY(`id`)
);
