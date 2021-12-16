let mongoose = require('mongoose');
let ObjectId = mongoose.Schema.ObjectId;
let deepPopulate = require('mongoose-deep-populate')(mongoose);


const UserOccupationSchema = mongoose.Schema({
    user: {type: ObjectId, ref: 'User'},
    type: {type: String, enum: ['hire', 'role', 'lesson', 'reward', 'violation', 'fire', ], default: 'employee'},


    company: {type: ObjectId, ref: 'Company'},
    employee: {type: ObjectId, ref: 'Employee'},
    role: {type: ObjectId, ref: 'Roles'},
    lesson: {type: ObjectId, ref: 'Lesson'},
    lessonCompany: {type: ObjectId, ref: 'Company'},



    then:{
        companyName: {type: String},
        roleTitle: {type: String},
        lesson:{
            lessonTitle:String,
            lessonHours:Number,
            lessonScore:Number,
            lessonCompanyName:String,
        }
    },


    created: {type: Date, default: Date.now},
});


UserOccupationSchema.plugin(deepPopulate, {
    whitelist: [],
    populate: {
    }
});


module.exports = mongoose.model('UserOccupation', UserOccupationSchema);