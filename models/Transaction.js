let mongoose = require('mongoose');
let ObjectId = mongoose.Schema.ObjectId;
let deepPopulate = require('mongoose-deep-populate')(mongoose);
let TransSchema = mongoose.Schema({
    created: {type:Date, default: Date.now},
    updated: {type:Date, default: Date.now},
    amount: {type: Number, default: 0},
    desc: {type: String, default: 0},
    userFrom:{type:ObjectId, ref:'User'},  // hudaldan awagchiin id
    from: {type: ObjectId, ref: 'Company'},
    to: {type: ObjectId, ref: 'Company'},
    accepted: {type: ObjectId, ref: 'Employee'},
    training: {type: ObjectId, ref: 'Training'},
    status:{
        type: String,
        enum: [
            'success', // amjilttai
            'pending', // gvilgee hiigdeed hvleegdej bui
            'fail', // aldaa garsan
            'delete', // admin ustgasan
            'cancel' // tsutslagdsan
        ],
        default: 'pending'
    },
    lessons: [{
        lesson_id: {type: ObjectId, ref: 'LessonPublish'},
        cost: {type: Number, default: 0}
    }],
    qpay: {
        payment_id: Number,
        qPay_QRcode: String,
        qPay_deeplink: [{type:Object,default: null}],
        payment_info: {type:Object,default: null}
    },
});
TransSchema.plugin(deepPopulate, {
    whitelist: ['userFrom', 'from', 'to', 'from.logo', 'to.logo', 'accepted', 'accepted.user', 'lessons.lesson_id'],
    populate: {
        'userFrom': {
            select: '_id username first_name last_name'
        },
        'from': {
            select: '_id name slug logo'
        },
        'to': {
            select: '_id name slug logo'
        },
        'from.logo':{
            select:'_id path name url thumb'
        },
        'to.logo':{
            select:'_id path name url thumb'
        },
        'accepted':{
            select:'_id user'
        },
        'accepted.user':{
            select: '_id username first_name last_name'
        },
        'lessons.lesson_id':{
            select: '_id title slug thumbnail thumbnailSmall'
        },
    }
});
module.exports = mongoose.model('Transaction', TransSchema);
