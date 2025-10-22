-- phpMyAdmin SQL Dump
-- version 5.2.0
-- https://www.phpmyadmin.net/
--
-- Host: localhost:3306
-- Generation Time: Oct 22, 2025 at 05:48 PM
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

-- --------------------------------------------------------

--
-- Table structure for table `account`
--

CREATE TABLE `account` (
  `acc_id` int NOT NULL,
  `acc_login` char(12) DEFAULT NULL,
  `acc_mail` char(50) DEFAULT NULL,
  `acc_mdp` char(20) DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 ;

-- --------------------------------------------------------

--
-- Table structure for table `pre_option`
--

CREATE TABLE `pre_option` (
  `pro_id` int NOT NULL,
  `pro_label` char(200) DEFAULT NULL,
  `prq_id` int DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 ;

-- --------------------------------------------------------

--
-- Table structure for table `pre_question`
--

CREATE TABLE `pre_question` (
  `prq_id` int NOT NULL,
  `prq_question` char(128) NOT NULL,
  `prq_desc_response` char(255) DEFAULT NULL,
  `prq_response` char(128) NOT NULL,
  `prq_image` char(128) DEFAULT NULL,
  `prq_type` char(4) NOT NULL,
  `prq_topic` char(32) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 ;

-- --------------------------------------------------------

--
-- Table structure for table `question`
--

CREATE TABLE `question` (
  `que_id` int NOT NULL,
  `que_question` char(128) NOT NULL,
  `que_desc_response` char(255) DEFAULT NULL,
  `que_image` char(128) DEFAULT NULL,
  `top_id` int NOT NULL,
  `typ_id` int NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 ;

--
-- Dumping data for table `question`
--

INSERT INTO `question` (`que_id`, `que_question`, `que_desc_response`, `que_image`, `top_id`, `typ_id`) VALUES
(1, 'En quelle année est sorti l\'album Or Noir de Kaaris ?', 'Or Noir, sorti en 2013, fût une révolution dans la trap et plus particulièrement dans le rap français.', NULL, 1, 2),
(2, 'Quel rappeur sort tous les sons qu\'il ne garde pas dans ses albums sous forme de mixtape poubelle ?', 'La Fève sors régulièrement des projets Empty the bin, souvent très longs et avec tout un tas de morceaux exclusifs !', NULL, 1, 1);

-- --------------------------------------------------------

--
-- Table structure for table `question_option`
--

CREATE TABLE `question_option` (
  `opt_id` int NOT NULL,
  `opt_label` char(200) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci NOT NULL,
  `que_id` int NOT NULL,
  `opt_iscorrect` int NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 ;

--
-- Dumping data for table `question_option`
--

INSERT INTO `question_option` (`opt_id`, `opt_label`, `que_id`, `opt_iscorrect`) VALUES
(1, '2013', 1, 1),
(2, 'deux mille treize', 1, 1),
(3, '2k13', 1, 1),
(4, 'Mairo', 2, 0),
(5, 'La Fève', 2, 1),
(6, 'H JeuneCrack', 2, 0),
(7, 'Jolagreen', 2, 0);

-- --------------------------------------------------------

--
-- Table structure for table `question_topic`
--

CREATE TABLE `question_topic` (
  `top_id` int NOT NULL,
  `top_label` char(50) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 ;

--
-- Dumping data for table `question_topic`
--

INSERT INTO `question_topic` (`top_id`, `top_label`) VALUES
(1, 'Rap');

-- --------------------------------------------------------

--
-- Table structure for table `question_type`
--

CREATE TABLE `question_type` (
  `typ_id` int NOT NULL,
  `typ_label` char(50) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 ;

--
-- Dumping data for table `question_type`
--

INSERT INTO `question_type` (`typ_id`, `typ_label`) VALUES
(1, 'qcm'),
(2, 'open');

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
-- Indexes for table `question_topic`
--
ALTER TABLE `question_topic`
  ADD PRIMARY KEY (`top_id`);

--
-- Indexes for table `question_type`
--
ALTER TABLE `question_type`
  ADD PRIMARY KEY (`typ_id`);

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
-- AUTO_INCREMENT for table `question_topic`
--
ALTER TABLE `question_topic`
  MODIFY `top_id` int NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=2;

--
-- AUTO_INCREMENT for table `question_type`
--
ALTER TABLE `question_type`
  MODIFY `typ_id` int NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=3;

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
