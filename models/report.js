let mongoose = require('mongoose');
let ObjectId = mongoose.Schema.ObjectId;
let deepPopulate = require('mongoose-deep-populate')(mongoose);

const Report = mongoose.Schema({
    title: {type: String, required: true},
    description: {type: String},
    shared_to: [{emp: {type: ObjectId, ref: 'Employee'}, user: {type: ObjectId, ref: 'User'}, viewed:{type:Boolean, default:false},  delete:{type:Boolean, default:false}, _id: false }],
    created_by: {emp: {type: ObjectId, ref: 'Employee'}, user: {type: ObjectId, ref: 'User'}, delete: {type:Boolean, default: false}},

    
    status: {type: String, enum: ["active", "delete"], default: "active"},
    created: {type: Date, default: Date.now},
});

Report.plugin(deepPopulate, {
    whitelist: ['created_by.emp', 'created_by.user', 'shared_to.emp', 'shared_to.user'],
    populate: {
        'created_by.emp': {
            select: '_id staticRole'
        },
        'created_by.user': {
            select: '_id last_name first_name'
        },
        'shared_to.emp': {
            select: '_id staticRole'
        },
        'shared_to.user': {
            select: '_id last_name first_name'
        }

    }
});

module.exports = mongoose.model('Report', Report);