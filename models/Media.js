var mongoose = require('mongoose');
var ObjectId = mongoose.Schema.ObjectId;
var deepPopulate = require('mongoose-deep-populate')(mongoose);
var MediaSchema = mongoose.Schema({
    company: {type: ObjectId, ref: 'Company'},
    user: {type: ObjectId, ref: 'User'},
    employee: {type: ObjectId, ref: 'Employee'},
    path: String,
    thumb: String,
    type: {type: String, enum: ['image', 'video', 'audio', 'file', 'pdf']},
    forWhat: {type: String, enum: ['lesson', 'lessonSmall', 'avatar', 'cover', 'employee']},
    name: String,
    original_name: String,
    url:String,
    imageWidth:Number,
    imageHeight:Number,
    created: {type:Date, default: Date.now},
    status: {type: String, enum: ['active', 'recycled','delete'], default:'active'},
    duration:Number,
    size:Number,
});

// MediaSchema.plugin(deepPopulate, {
//     whitelist: ['company', 'user'],
//     populate: {
//         "user": '_id username last_name first_name'
//     }
// });

module.exports = mongoose.model('Media', MediaSchema);