class Question {
    constructor(id, question, options, response, desc, topic, type, image_link) {
        this.id = id;
        this.question = question;
        this.options = options;
        this.response = response;
        this.desc = desc;
        this.image_link = image_link;
        this.topic = topic;
        this.type = type;
    }
}

export default Question;