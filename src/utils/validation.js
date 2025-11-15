const Joi = require('joi');

/**
 * Schéma de validation pour l'ajout de question
 */
const questionSchema = Joi.object({
  question: Joi.string().min(5).max(500).required(),
  options: Joi.array().items(Joi.string().max(200)).min(1).max(10).required(),
  response: Joi.string().max(200).required(),
  desc: Joi.string().max(1000).allow('', null),
  topic: Joi.object({
    id: Joi.number().integer().positive().required(),
    label: Joi.string().max(100).required()
  }).required(),
  type: Joi.object({
    id: Joi.number().integer().positive().required(),
    label: Joi.string().max(50).required()
  }).required(),
  image_link: Joi.string().uri().max(500).allow('', null)
});

/**
 * Schéma de validation pour les règles du jeu
 */
const gameRulesSchema = Joi.object({
  rulesOption: Joi.string().valid('FixedQuestions', 'ScoreMax').required(),
  scoreMax: Joi.number().integer().min(0).max(100).required(),
  questionMax: Joi.number().integer().min(0).max(100).required(),
  qcmTimeLimit: Joi.number().integer().min(5).max(60).required(),
  openTimeLimit: Joi.number().integer().min(5).max(120).required(),
  selectedTopics: Joi.array().items(Joi.number().integer().positive()).min(0).required()
});

/**
 * Valider un objet selon un schéma
 */
function validate(schema, data) {
  const { error, value } = schema.validate(data, {
    abortEarly: false,
    stripUnknown: true
  });
  
  if (error) {
    const errors = error.details.map(d => d.message).join(', ');
    throw new Error(`Validation error: ${errors}`);
  }
  
  return value;
}

module.exports = {
  questionSchema,
  gameRulesSchema,
  validate
};
