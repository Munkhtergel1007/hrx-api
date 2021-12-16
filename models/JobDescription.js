let mongoose = require('mongoose');
let ObjectId = mongoose.Schema.ObjectId;
let deepPopulate = require('mongoose-deep-populate')(mongoose);

const JobDescription = mongoose.Schema({
    company: {type: ObjectId, ref: 'Company'},
    title: {type: String},
    description: {type: String},
    created: {type: Date, default: Date.now},
    status: {type: String, enum: ['active', 'deleted'], default: 'active'},
    duties: [{
        title: {type: String},
        list: [
            {
                title: {type: String},
                repetition: {type: String, enum: ['udur', 'sar', 'tuhai']}
            }
        ]
    }],
    direct: [{type: String}],
    indirect: [{type: String}],
    substitute: [{type: String}],
    manage: [{type: String}],
    edited: [
        {
            date: {type: Date, default: Date.now},
            by: {emp: {type: ObjectId, ref: 'Employee'}, user: {type: ObjectId, ref: 'User'}},
        }
    ],
    units: {
        inner: [{type: String}],
        outer: [{type: String}]
    },
    qualification: {
        behavior: [{type: String}],
        soft_skills: [{type: String}],
        hard_skills: [{type: String}],
        language: [{type: String}],
        computer_knowledge: [{type: String}]
    }
});

JobDescription.plugin(deepPopulate, {
    whitelist: [],
    populate: {

    }
});
module.exports = mongoose.model('JobDescription', JobDescription);