let mongoose = require('mongoose');
let ObjectId = mongoose.Schema.ObjectId;
let deepPopulate = require('mongoose-deep-populate')(mongoose);

const Orientation = mongoose.Schema({
    status: {type: String, enum: ['active', 'deleted'], default: 'active'},
    company: {type: ObjectId, ref: 'Company'},
    created: {type: Date, default: Date.now},
    title: {type: String},
    list_environment: [{type: String}],
    list_extra: [{type: String}],
});

Orientation.plugin(deepPopulate, {
    whitelist: [],
    populate: {

    }
});
module.exports = mongoose.model('Orientation', Orientation);