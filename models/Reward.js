let mongoose = require('mongoose');
let ObjectId = mongoose.Schema.ObjectId;
let deepPopulate = require('mongoose-deep-populate')(mongoose);


const RewardSchema = mongoose.Schema({
    company: {type: ObjectId, ref: 'Company'},
    employee: {emp: {type: ObjectId, ref: 'Employee'}, user: {type: ObjectId, ref: 'User'}},
    created: {type: Date, default: Date.now},
    status: {type: String, enum: ['active', 'delete'], default: 'active'},
    title: String,
    description: String,
    date: {type: Date}
});
RewardSchema.plugin(deepPopulate, {
    whitelist: [],
    populate: {

    }
});
module.exports = mongoose.model('Reward', RewardSchema);