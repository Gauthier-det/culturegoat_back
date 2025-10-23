--
-- Dumping data for table `question_type`
--

INSERT INTO `question_type` (`typ_id`, `typ_label`) VALUES
(1, 'qcm'),
(2, 'open');

--
-- Dumping data for table `question_topic`
--

INSERT INTO `question_topic` (`top_id`, `top_label`) VALUES
(1, 'Rap'),
(2, 'Littérature');

--
-- Dumping data for table `question`
--

INSERT INTO `question` (`que_id`, `que_question`, `que_desc_response`, `que_image`, `top_id`, `typ_id`) VALUES
(1, 'En quelle année est sorti l\'album Or Noir de Kaaris ?', 'Or Noir, sorti en 2013, fût une révolution dans la trap et plus particulièrement dans le rap français.', NULL, 1, 2),
(2, 'Quel rappeur sort tous les sons qu\'il ne garde pas dans ses albums sous forme de mixtape poubelle ?', 'La Fève sors régulièrement des projets Empty the bin, souvent très longs et avec tout un tas de morceaux exclusifs !', NULL, 1, 1),
(3, 'Qui a écrit le roman intitulé \"L\'immortalité\" ?', 'C\'est en effet Milan Kundera, auteur tchéquo-français du 20e siècle.', NULL, 2, 1),
(4, 'Quel est le nom du troisième projet de SCH ?', 'Deo Favente est sorti en 2017, juste avant le très célèbre JVLIVS', NULL, 1, 2);

-- --------------------------------------------------------

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
(7, 'Jolagreen', 2, 0),
(8, 'David Foenkinos', 3, 0),
(9, 'Albert Camus', 3, 0),
(10, 'Franz Kafka', 3, 0),
(11, 'Milan Kundera', 3, 1),
(12, 'deo favente', 4, 1);