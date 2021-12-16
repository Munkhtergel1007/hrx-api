let mongoose = require('mongoose');
let ObjectId = mongoose.Schema.ObjectId;
let deepPopulate = require('mongoose-deep-populate')(mongoose);


const Training = mongoose.Schema({
    name: String,
    desc: String,
    contractNumber: String, // gereenii dugaar
    limit: Number, // suuh hvnii hyzgaar
    cost: Number, // vniin dvn, zarlaga
    status: {type: String, enum: ["approved", "requested", "pending", "delete", "disapprove"]},
    type: {type: String, enum: [
            "pro",  // mergejiliin surgalt
            "skill",  // ur chadwariin surgalt
            "newbee", // dotood. shine ajiltnii
            "soft_skill", // huwi hvnii hugjil
            "contracted"  // gereet surgalt
    ]},
    isInternal: {type: Boolean, default: false}, // dotood surgalt eseh
    company: {type: ObjectId, ref: 'Company'},
    applies: [{
        employee: {type: ObjectId, ref: 'Employee'},
        status: {type: String, enum: ["tas", "suusan"]}
    }],
    requester: {type: ObjectId, ref: 'Employee'},
    accepted: {type: ObjectId, ref: 'Employee'},
    start_date: {type: Date, default: null},
    end_date: {type: Date, default: null},
    created: {type: Date, default: Date.now},
});

Training.deepPopulate(deepPopulate, {
    whitelist: ['company', 'company.logo', 'applies.employee', 'applies.employee.user', 'applies.employee.user.avatar', 'requester', 'requester.user', 'requester.user.avatar', 'accepted', 'accepted.user', 'accepted.user.avatar'],
    populate: {
        'company': {
            select: '_id logo name slug'
        },
        'company.logo': {
            select: '_id path url'
        },
        'applies.employee': {
            select: '_id user'
        },
        'applies.employee.user': {
            select: '_id username last_name first_name avatar'
        },
        'applies.employee.user.avatar': {
            select: '_id path url'
        },
        'requester': {
            select: '_id user'
        },
        'requester.user': {
            select: '_id username last_name first_name avatar'
        },
        'requester.user.avatar': {
            select: '_id path url'
        },
        'accepted': {
            select: '_id user'
        },
        'accepted.user': {
            select: '_id username last_name first_name avatar'
        },
        'accepted.user.avatar': {
            select: '_id path url'
        }
    }
});

module.exports = mongoose.model('Training', Training);