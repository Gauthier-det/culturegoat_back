class GameRules {
    constructor(rules, scoreMax, qcmTimeLimit, openTimeLimit, questionMax, selectedTopics) {
        this.rules = rules;
        this.scoreMax = scoreMax;
        this.qcmTimeLimit = qcmTimeLimit;
        this.openTimeLimit = openTimeLimit;
        this.questionMax = questionMax;
        this.selectedTopics = selectedTopics || [];

    }
}

module.exports = GameRules;