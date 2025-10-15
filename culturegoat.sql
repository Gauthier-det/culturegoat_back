-- phpMyAdmin SQL Dump
-- version 5.2.0
-- https://www.phpmyadmin.net/
--
-- Host: localhost:3306
-- Generation Time: Oct 15, 2025 at 05:23 PM
-- Server version: 8.0.36
-- PHP Version: 8.1.10

SET SQL_MODE = "NO_AUTO_VALUE_ON_ZERO";
START TRANSACTION;
SET time_zone = "+00:00";


/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!40101 SET @OLD_CHARACTER_SET_RESULTS=@@CHARACTER_SET_RESULTS */;
/*!40101 SET @OLD_COLLATION_CONNECTION=@@COLLATION_CONNECTION */;
/*!40101 SET NAMES utf8mb4 */;

--
-- Database: `culturegoat`
--
CREATE DATABASE IF NOT EXISTS `culturegoat` DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci;
USE `culturegoat`;

-- --------------------------------------------------------

--
-- Table structure for table `account`
--

DROP TABLE IF EXISTS `account`;
CREATE TABLE `account` (
  `acc_id` int NOT NULL,
  `acc_login` char(12) DEFAULT NULL,
  `acc_mail` char(50) DEFAULT NULL,
  `acc_mdp` char(20) DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- --------------------------------------------------------

--
-- Table structure for table `pre_option`
--

DROP TABLE IF EXISTS `pre_option`;
CREATE TABLE `pre_option` (
  `pro_id` int NOT NULL,
  `pro_label` char(200) DEFAULT NULL,
  `prq_id` int DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- --------------------------------------------------------

--
-- Table structure for table `pre_question`
--

DROP TABLE IF EXISTS `pre_question`;
CREATE TABLE `pre_question` (
  `prq_id` int NOT NULL,
  `prq_question` char(128) NOT NULL,
  `prq_desc_response` char(255) DEFAULT NULL,
  `prq_response` char(128) NOT NULL,
  `prq_image` char(128) DEFAULT NULL,
  `prq_type` char(4) NOT NULL,
  `prq_topic` char(32) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- --------------------------------------------------------

--
-- Table structure for table `question`
--

DROP TABLE IF EXISTS `question`;
CREATE TABLE `question` (
  `que_id` int NOT NULL,
  `que_question` char(128) NOT NULL,
  `que_desc_response` char(255) DEFAULT NULL,
  `que_response` char(128) NOT NULL,
  `que_image` char(128) DEFAULT NULL,
  `que_type` char(4) NOT NULL,
  `que_topic` char(32) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

--
-- Dumping data for table `question`
--

INSERT INTO `question` (`que_id`, `que_question`, `que_desc_response`, `que_response`, `que_image`, `que_type`, `que_topic`) VALUES
(1, 'En quelle année est sorti l\'album Or Noir de Kaaris ?', 'Or Noir, sorti en 2013, fût une révolution dans la trap et plus particulièrement dans le rap français.', '1', NULL, 'open', 'rap'),
(2, 'Quel rappeur sort tous les sons qu\'il ne garde pas dans ses albums sous forme de mixtape poubelle ?', 'La Fève sors régulièrement des projets Empty the bin, souvent très longs et avec tout un tas de morceaux exclusifs !', 'La Fève', NULL, 'qcm', 'rap');

-- --------------------------------------------------------

--
-- Table structure for table `question_option`
--

DROP TABLE IF EXISTS `question_option`;
CREATE TABLE `question_option` (
  `opt_id` int NOT NULL,
  `opt_label` char(200) DEFAULT NULL,
  `que_id` int DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

--
-- Dumping data for table `question_option`
--

INSERT INTO `question_option` (`opt_id`, `opt_label`, `que_id`) VALUES
(1, '2013', 1),
(2, 'deux mille treize', 1),
(3, '2k13', 1),
(4, 'Mairo', 2),
(5, 'La Fève', 2),
(6, 'H JeuneCrack', 2),
(7, 'Jolagreen', 2);

--
-- Indexes for dumped tables
--

--
-- Indexes for table `account`
--
ALTER TABLE `account`
  ADD PRIMARY KEY (`acc_id`);

--
-- Indexes for table `pre_option`
--
ALTER TABLE `pre_option`
  ADD PRIMARY KEY (`pro_id`),
  ADD KEY `PRO_PRQ` (`prq_id`);

--
-- Indexes for table `pre_question`
--
ALTER TABLE `pre_question`
  ADD PRIMARY KEY (`prq_id`);

--
-- Indexes for table `question`
--
ALTER TABLE `question`
  ADD PRIMARY KEY (`que_id`);

--
-- Indexes for table `question_option`
--
ALTER TABLE `question_option`
  ADD PRIMARY KEY (`opt_id`),
  ADD KEY `OPT_QUE` (`que_id`);

--
-- AUTO_INCREMENT for dumped tables
--

--
-- AUTO_INCREMENT for table `account`
--
ALTER TABLE `account`
  MODIFY `acc_id` int NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `pre_option`
--
ALTER TABLE `pre_option`
  MODIFY `pro_id` int NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `pre_question`
--
ALTER TABLE `pre_question`
  MODIFY `prq_id` int NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `question`
--
ALTER TABLE `question`
  MODIFY `que_id` int NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=3;

--
-- AUTO_INCREMENT for table `question_option`
--
ALTER TABLE `question_option`
  MODIFY `opt_id` int NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=8;

--
-- Constraints for dumped tables
--

--
-- Constraints for table `pre_option`
--
ALTER TABLE `pre_option`
  ADD CONSTRAINT `PRO_PRQ` FOREIGN KEY (`prq_id`) REFERENCES `pre_question` (`prq_id`);

--
-- Constraints for table `question_option`
--
ALTER TABLE `question_option`
  ADD CONSTRAINT `OPT_QUE` FOREIGN KEY (`que_id`) REFERENCES `question` (`que_id`);
COMMIT;

/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
