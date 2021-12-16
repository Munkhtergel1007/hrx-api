let mongoose = require('mongoose');
let ObjectId = mongoose.Schema.ObjectId;
let deepPopulate = require('mongoose-deep-populate')(mongoose);


const Department = mongoose.Schema({
    title: {type:String},
    company: {type: ObjectId, ref: 'Company'},
    // sections: [{
    //     title: {type: String}
    // }],
    status: {type: String, enum: ['active', 'delete'], default:'active'},
    created: {type: Date, default: Date.now}
});
module.exports = mongoose.model('Department', Department);