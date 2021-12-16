let mongoose = require('mongoose');
let ObjectId = mongoose.Schema.ObjectId;
let deepPopulate = require('mongoose-deep-populate')(mongoose);

const OrientationEmployee = mongoose.Schema({
    employee: {type: ObjectId, ref: 'Employee'},
    company: {type: ObjectId, ref: 'Company'},
    status: {type: String, enum: ['done', 'doing'], default: 'doing'},
    created: {type: Date, default: Date.now},
    list_environment: [{title: {type: String}, done: {type: Boolean}}],
    list_extra: [{title: {type: String}, done: {type: Boolean}}],
});

OrientationEmployee.plugin(deepPopulate, {
    whitelist: ['employee'],
    populate: {
        'employee': {
            select: '_id user staticRole'
        }
    }
});
module.exports = mongoose.model('OrientationEmployee', OrientationEmployee);