class GameRules {
    constructor(rules, scoreMax, qcmTimeLimit, openTimeLimit, questionMax) {
        this.rules = rules,
        this.scoreMax = scoreMax,
        this.qcmTimeLimit = qcmTimeLimit,
        this.openTimeLimit = openTimeLimit,
        this.questionMax = questionMax
    }
}

module.exports = GameRules;