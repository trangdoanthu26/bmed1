CREATE DATABASE  IF NOT EXISTS `infusion_monitoring` /*!40100 DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci */ /*!80016 DEFAULT ENCRYPTION='N' */;
USE `infusion_monitoring`;
-- MySQL dump 10.13  Distrib 8.0.45, for Win64 (x86_64)
--
-- Host: localhost    Database: infusion_monitoring
-- ------------------------------------------------------
-- Server version	8.0.45

/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!40101 SET @OLD_CHARACTER_SET_RESULTS=@@CHARACTER_SET_RESULTS */;
/*!40101 SET @OLD_COLLATION_CONNECTION=@@COLLATION_CONNECTION */;
/*!50503 SET NAMES utf8 */;
/*!40103 SET @OLD_TIME_ZONE=@@TIME_ZONE */;
/*!40103 SET TIME_ZONE='+00:00' */;
/*!40014 SET @OLD_UNIQUE_CHECKS=@@UNIQUE_CHECKS, UNIQUE_CHECKS=0 */;
/*!40014 SET @OLD_FOREIGN_KEY_CHECKS=@@FOREIGN_KEY_CHECKS, FOREIGN_KEY_CHECKS=0 */;
/*!40101 SET @OLD_SQL_MODE=@@SQL_MODE, SQL_MODE='NO_AUTO_VALUE_ON_ZERO' */;
/*!40111 SET @OLD_SQL_NOTES=@@SQL_NOTES, SQL_NOTES=0 */;

--
-- Table structure for table `fluid_types`
--

DROP TABLE IF EXISTS `fluid_types`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `fluid_types` (
  `id` char(36) COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT (uuid()),
  `name` varchar(100) COLLATE utf8mb4_unicode_ci NOT NULL,
  `density` decimal(6,3) DEFAULT NULL COMMENT 'g/ml',
  `safe_max_drop_rate` int DEFAULT NULL COMMENT 'giọt/phút tối đa an toàn',
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `fluid_types`
--

LOCK TABLES `fluid_types` WRITE;
/*!40000 ALTER TABLE `fluid_types` DISABLE KEYS */;
/*!40000 ALTER TABLE `fluid_types` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `infusion_alerts`
--

DROP TABLE IF EXISTS `infusion_alerts`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `infusion_alerts` (
  `id` char(36) COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT (uuid()),
  `session_id` char(36) COLLATE utf8mb4_unicode_ci NOT NULL,
  `alert_type` varchar(50) COLLATE utf8mb4_unicode_ci NOT NULL COMMENT 'drop_rate_high | weight_low',
  `message` text COLLATE utf8mb4_unicode_ci,
  `is_read` tinyint(1) NOT NULL DEFAULT '0',
  `triggered_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_alert_session` (`session_id`),
  KEY `idx_alert_unread` (`is_read`,`triggered_at`),
  CONSTRAINT `fk_alert_session` FOREIGN KEY (`session_id`) REFERENCES `infusion_sessions` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `infusion_alerts`
--

LOCK TABLES `infusion_alerts` WRITE;
/*!40000 ALTER TABLE `infusion_alerts` DISABLE KEYS */;
/*!40000 ALTER TABLE `infusion_alerts` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `infusion_devices`
--

DROP TABLE IF EXISTS `infusion_devices`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `infusion_devices` (
  `id` char(36) COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT (uuid()),
  `mac_address` varchar(50) COLLATE utf8mb4_unicode_ci NOT NULL,
  `location_room` varchar(50) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `location_bed` varchar(50) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `status` enum('available','active','error','unassigned') COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'unassigned',
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `mac_address` (`mac_address`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `infusion_devices`
--

LOCK TABLES `infusion_devices` WRITE;
/*!40000 ALTER TABLE `infusion_devices` DISABLE KEYS */;
INSERT INTO `infusion_devices` VALUES ('0acec8c8-46df-11f1-8d28-6018953db4d6','AA:BB:CC:DD:EE:11','Phòng 101','Giường 1','active','2026-05-03 17:58:39'),('0acf30d3-46df-11f1-8d28-6018953db4d6','AA:BB:CC:DD:EE:22','Phòng 102','Giường 3','available','2026-05-03 17:58:39');
/*!40000 ALTER TABLE `infusion_devices` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `infusion_issues`
--

DROP TABLE IF EXISTS `infusion_issues`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `infusion_issues` (
  `id` char(36) COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT (uuid()),
  `session_id` char(36) COLLATE utf8mb4_unicode_ci NOT NULL,
  `reported_by` char(36) COLLATE utf8mb4_unicode_ci NOT NULL,
  `issue_type` varchar(100) COLLATE utf8mb4_unicode_ci NOT NULL,
  `description` text COLLATE utf8mb4_unicode_ci,
  `status` enum('pending','investigating','resolved') COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'pending',
  `reported_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `fk_issue_session` (`session_id`),
  KEY `fk_issue_reporter` (`reported_by`),
  KEY `idx_issue_status` (`status`),
  CONSTRAINT `fk_issue_reporter` FOREIGN KEY (`reported_by`) REFERENCES `users` (`id`),
  CONSTRAINT `fk_issue_session` FOREIGN KEY (`session_id`) REFERENCES `infusion_sessions` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `infusion_issues`
--

LOCK TABLES `infusion_issues` WRITE;
/*!40000 ALTER TABLE `infusion_issues` DISABLE KEYS */;
/*!40000 ALTER TABLE `infusion_issues` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `infusion_metrics_logs`
--

DROP TABLE IF EXISTS `infusion_metrics_logs`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `infusion_metrics_logs` (
  `id` bigint NOT NULL AUTO_INCREMENT,
  `session_id` char(36) COLLATE utf8mb4_unicode_ci NOT NULL,
  `current_drop_rate` int NOT NULL COMMENT 'giọt/phút',
  `current_weight` decimal(8,2) NOT NULL COMMENT 'gram',
  `remaining_time` int DEFAULT NULL COMMENT 'phút còn lại (backend tính)',
  `recorded_at` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  PRIMARY KEY (`id`),
  KEY `idx_metrics_session_time` (`session_id`,`recorded_at`),
  CONSTRAINT `fk_metrics_session` FOREIGN KEY (`session_id`) REFERENCES `infusion_sessions` (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=2 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `infusion_metrics_logs`
--

LOCK TABLES `infusion_metrics_logs` WRITE;
/*!40000 ALTER TABLE `infusion_metrics_logs` DISABLE KEYS */;
INSERT INTO `infusion_metrics_logs` VALUES (1,'3a5198d7-46df-11f1-8d28-6018953db4d6',60,450.00,NULL,'2026-05-03 18:09:41.000');
/*!40000 ALTER TABLE `infusion_metrics_logs` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `infusion_sessions`
--

DROP TABLE IF EXISTS `infusion_sessions`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `infusion_sessions` (
  `id` char(36) COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT (uuid()),
  `device_id` char(36) COLLATE utf8mb4_unicode_ci NOT NULL,
  `patient_id` char(36) COLLATE utf8mb4_unicode_ci NOT NULL,
  `staff_id` char(36) COLLATE utf8mb4_unicode_ci NOT NULL,
  `fluid_type_id` char(36) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `initial_weight` decimal(8,2) NOT NULL COMMENT 'gram',
  `status` enum('normal','warning','urgent','completed') COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'normal',
  `start_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `end_at` datetime DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `fk_session_staff` (`staff_id`),
  KEY `fk_session_fluid` (`fluid_type_id`),
  KEY `idx_session_status` (`status`),
  KEY `idx_session_patient` (`patient_id`),
  KEY `idx_session_device` (`device_id`),
  KEY `idx_session_start` (`start_at`),
  CONSTRAINT `fk_session_device` FOREIGN KEY (`device_id`) REFERENCES `infusion_devices` (`id`),
  CONSTRAINT `fk_session_fluid` FOREIGN KEY (`fluid_type_id`) REFERENCES `fluid_types` (`id`),
  CONSTRAINT `fk_session_patient` FOREIGN KEY (`patient_id`) REFERENCES `patient_profiles` (`id`),
  CONSTRAINT `fk_session_staff` FOREIGN KEY (`staff_id`) REFERENCES `users` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `infusion_sessions`
--

LOCK TABLES `infusion_sessions` WRITE;
/*!40000 ALTER TABLE `infusion_sessions` DISABLE KEYS */;
INSERT INTO `infusion_sessions` VALUES ('3a5198d7-46df-11f1-8d28-6018953db4d6','0acec8c8-46df-11f1-8d28-6018953db4d6','50e4b41e-46dc-11f1-8d28-6018953db4d6','50daf239-46dc-11f1-8d28-6018953db4d6',NULL,500.00,'normal','2026-05-03 17:59:59',NULL);
/*!40000 ALTER TABLE `infusion_sessions` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `patient_profiles`
--

DROP TABLE IF EXISTS `patient_profiles`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `patient_profiles` (
  `id` char(36) COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT (uuid()),
  `full_name` varchar(200) COLLATE utf8mb4_unicode_ci NOT NULL,
  `phone` varchar(20) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `room_number` varchar(20) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `bed_number` varchar(20) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_full_name` (`full_name`),
  KEY `idx_phone` (`phone`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `patient_profiles`
--

LOCK TABLES `patient_profiles` WRITE;
/*!40000 ALTER TABLE `patient_profiles` DISABLE KEYS */;
INSERT INTO `patient_profiles` VALUES ('50e4b41e-46dc-11f1-8d28-6018953db4d6','Trần Thị B','0901234567','101','1','2026-05-03 17:39:08');
/*!40000 ALTER TABLE `patient_profiles` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `users`
--

DROP TABLE IF EXISTS `users`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `users` (
  `id` char(36) COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT (uuid()),
  `name` varchar(150) COLLATE utf8mb4_unicode_ci NOT NULL,
  `email` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `password_hash` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `role` enum('staff','admin') COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'staff',
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `email` (`email`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `users`
--

LOCK TABLES `users` WRITE;
/*!40000 ALTER TABLE `users` DISABLE KEYS */;
INSERT INTO `users` VALUES ('50daf239-46dc-11f1-8d28-6018953db4d6','Nguyễn Văn A','staff@hospital.com','123456','staff','2026-05-03 17:39:08');
/*!40000 ALTER TABLE `users` ENABLE KEYS */;
UNLOCK TABLES;
/*!40103 SET TIME_ZONE=@OLD_TIME_ZONE */;

/*!40101 SET SQL_MODE=@OLD_SQL_MODE */;
/*!40014 SET FOREIGN_KEY_CHECKS=@OLD_FOREIGN_KEY_CHECKS */;
/*!40014 SET UNIQUE_CHECKS=@OLD_UNIQUE_CHECKS */;
/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
/*!40111 SET SQL_NOTES=@OLD_SQL_NOTES */;

-- Dump completed on 2026-05-05 10:12:38
