let mongoose = require('mongoose');
let ObjectId = mongoose.Schema.ObjectId;
let deepPopulate = require('mongoose-deep-populate')(mongoose);
let CustomerSchema = mongoose.Schema({
    //Primary
    register_id: {type: String, required: true},
    parentCompany: {type: ObjectId, ref: 'Company'}, // (req.company.parent || req.company._id)
    status: {type: String, enum: ['active', 'pending', 'delete'], default: 'pending'},
    //Secondary
    first_name: String, //ner
    last_name: String, //owog
    phone: {type: String},
    email: {type: String},
    gender: {type: String, enum: ['male', 'female']},
    //Tertiary
    nationality: {type: String}, // ys undes
    address: {
        country: {
            type: String,
            // enum: ['mongolia', 'kazakhstan', 'russia']
        },
        region: {
            type: String,
            // enum: ['Улаанбаатар', 'Архангай', 'Баян-Өлгий', 'Баянхонгор', 'Булган', 'Говь-Алтай', 'Говьсүмбэр', 'Дархан-Уул', 'Дорноговь', 'Дорнод', 'Дундговь', 'Завхан', 'Орхон', 'Өвөрхангай', 'Өмнөговь', 'Сүхбаатар', 'Сэлэнгэ', 'Төв', 'Увс', 'Ховд', 'Хөвсгөл', 'Хэнтий']
        },
        district: {type: String},
        horoo: {type: String},
        street: {type: String},
        streetNum: {type: String},
    },
    //quaternary
    birthday: {type:Date},
});
CustomerSchema.plugin(deepPopulate, {
    whitelist: ['parentCompany'],
    populate: {
        'parentCompany': {
            select: '_id name'
        }
    }
});
module.exports = mongoose.model('Customer', CustomerSchema);
