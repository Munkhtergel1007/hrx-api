let mongoose = require('mongoose');
let ObjectId = mongoose.Schema.ObjectId;
let deepPopulate = require('mongoose-deep-populate')(mongoose);

const Roles = mongoose.Schema({
    name: {type: String},
    desc: {type: String},
    actions: [{type: String}],
    status: {type: String, enum: ["active", "delete"], default: "active"},
    company: {type: ObjectId, ref: 'Company'},
    created: {type: Date, default: Date.now},
    updated: {type: Date, default: Date.now},
    jobDescription: {type: ObjectId, ref: 'JobDescription'},
    orientation: {type: ObjectId, ref: 'Orientation'},
});
Roles.plugin(deepPopulate, {
    whitelist: ['jobDescription', 'orientation'],
    populate: {
        'jobDescription': {
            select: '_id title'
        },
        'orientation': {
            select: '_id title'
        }
    }
});
module.exports = mongoose.model('Roles', Roles);