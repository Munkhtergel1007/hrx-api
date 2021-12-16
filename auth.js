import {locale} from "./lang";

let authentications = {
    admin: function(req, res, next) {
        if(req.admin){
            next();
        }else{
            return res.status(400).json({message: locale("cannot_access")});
        }
    },
    user: function(req, res, next) {
        if(req.user){
            next();
        }else{
            return res.status(400).json({message: locale("cannot_access")});
        }
    },
    employee: function(req, res, next) {
        if(req.employee && req.company && req.employee.company._id.toString() === req.company._id.toString()){
            next();
        }else{
            return res.status(400).json({message: locale("cannot_access")});
        }
    },
    company: function(req, res, next, actions = [], ownAction = false, onlyMe = false) {
        let me = false;
        if(ownAction && req.params.employee && req.employee && (req.params.employee || 'bb').toString() === (req.employee._id || 'aa').toString()){
            me = true;
        }
        if(req.company && req.employee){
            let hadAction = false;
            // if((actions || []).length > 0){
                hadAction = actions.length > 0 ? (((req.employee || {}).role || {}).actions || []).some((c) => actions.indexOf(c) > -1) : true;
            // }
            let hasAccess = ((req.employee || {}).staticRole === 'lord' || (req.employee || {}).staticRole === 'hrManager' || (req.employee || {}).staticRole === 'chairman')
                || hadAction || me;
            if(onlyMe){
                if(me){
                    next();
                }else{
                    return res.json({success: false, msg: locale("cannot_access")});
                }
            }else{
                if(hasAccess){
                    next();
                }else{
                    return res.json({success: false, msg: locale("cannot_access"), uid: req.params.uid});
                }
            }
        }else{
            return res.status(400).json({message: locale("cannot_access")});
        }
    },

    companyAdministrator: function(req, res, next) {
        if(req.company && req.employee){
            let hasAccess = ((req.employee || {}).staticRole === 'lord' || (req.employee || {}).staticRole === 'hrManager' || (req.employee || {}).staticRole === 'chairman');
            if(hasAccess){
                next();
            }else{
                return res.json({success: false, msg: locale("cannot_access"), uid: req.params.uid});
            }
        }else{
            return res.status(400).json({message: locale("cannot_access")});
        }
    },
    companyLord: function(req, res, next) {
        if(req.company && req.employee){
            let hasAccess = (req.employee || {}).staticRole === 'lord';
            if(hasAccess){
                next();
            }else{
                return res.json({success: false, msg: locale("cannot_access"), uid: req.params.uid});
            }
        }else{
            return res.status(400).json({message: locale("cannot_access")});
        }
    },
    companyHrManager: function(req, res, next) {
        if(req.company && req.employee){
            let hasAccess = (req.employee || {}).staticRole === 'hrManager';
            if(hasAccess){
                next();
            }else{
                return res.json({success: false, msg: locale("cannot_access"), uid: req.params.uid});
            }
        }else{
            return res.status(400).json({message: locale("cannot_access")});
        }
    },
    massAttendance: function(req, res, next) {
        if(req.company && req.employee){
            let hasAccess = ((req.employee || {}).staticRole === 'attendanceCollector');
            if(hasAccess){
                next();
            } else {
                return res.status(400).json({message: locale("cannot_access")});
            }
        }else{
            return res.status(400).json({message: locale("cannot_access")});
        }
    },
};
module.exports = authentications;