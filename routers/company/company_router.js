import auth from "../../auth";
import Company from "../../models/Company";
import SubTag from '../../models/SubTag'
import Workplan_tag from '../../models/Workplan_tag';
import JobDescription from '../../models/JobDescription';
import async from "async";
import Roles from '../../models/Roles';
import {isId, winsErr, companyAdministrator} from '../../config';
import Reference from "../../models/Reference";
import {locale} from "../../lang";

module.exports = function (router) {
    router.get(['/get/sliders/:company', '/get/sliders'], (req, res, next) => auth.company(req, res, next, ['edit_company_informations']), function(req, res){
        let company = (req.company || {})._id || req.params.company;
        if(isId(company)){
            Company.findOne({_id: company, status: 'active'}, {slider: 1}).deepPopulate('slider').lean().exec(function(err, comp){
                if(err){winsErr(req, err, 'Company.findOne');}
                if(comp){
                    return res.json({success: true, slider: comp.slider || []});
                } else {
                    return res.json({success: false, msg: locale("company_routers_all.slider_not_found"), slider: []});
                }
            });
        } else {
            return res.json({success: false, msg: locale("company_routers_all.slider_not_found")});
        }
    });
    router.post('/remove/slider', (req, res, next) => auth.company(req, res, next, ['edit_company_informations']), function(req, res){
        const { _id, uid } = req.body || {};
        Company.findOneAndUpdate({_id: req.company._id, status: 'active'}, {$pull: {slider: _id}}, {}, function(err, comp){
            if(err){winsErr(req, err, 'Company.findOneAndUpdate')}
            return res.json({success: !(err), sucmod: !(err), uid: uid, _id: _id, msg: err ? locale("company_routers_all.image_removal_error") : locale("company_routers_all.image_removal_success")});
        })
    });
    router.get('/get/subtags', (req, res, next) => auth.company(req, res, next, []), function(req, res){
        let compReq = req.company || {}
        SubTag.find({company: compReq._id, status: {$ne: 'deleted'}}).exec(function (err, subtags){
            if(err) {winsErr(req, res, 'SubTag.find()')}
            return res.json({success: !(err), subtags})
        })
    });
    router.get('/get/tags/subtag/parent', (req, res, next) => auth.employee(req, res, next), function(req, res){
        let company = {company: req.company._id};
        if(companyAdministrator(req.employee)){
            company = {company: {$in: [...(req.subsidiaries || []), req.company._id]}}
        }
        Workplan_tag.find({$and: [{status: 'active'}, company]})
            .sort({company: 1})
            .deepPopulate(['company'])
            .lean()
            .exec( function(err,result) {
                async.map(result, function(item, cb){
                    SubTag.find({parent_tag: item._id, status:'active'}).sort({created: -1}).lean().exec(function(errT, subTags){
                        cb((err || errT),
                            {
                                ...item,
                                subTags: (subTags || [])
                            }
                        );
                    });
                }, function(err, ress){
                    if(err){
                        winsErr(req, err, '/get/tags/subtag/parent');
                        return res.json({success: true, workplan_tags: []});
                    }
                    return res.json({success: true, workplan_tags: ress})
                });
            });
    });
    router.post('/create/jobDescriptions', (req, res, next) => auth.company(req, res, next, []), function(req, res){
        const {title, management, description, duties, units, qualification, _id} = req.body;

        function getObject(jobDesc){
            jobDesc.title = title || '';
            jobDesc.description = description || '';
            jobDesc.duties = (duties || []).map(duty => {
                return {
                    title: duty.title,
                    list: (duty.list || []).map(dut => {
                        return {
                            title: dut.title || '',
                            repetition: dut.repetition || ''
                        }
                    })
                }
            });
            jobDesc.units = {
                inner: ((units || [])['inner'] || []).map(inn => (inn.title || '')),
                outer: ((units || [])['outer'] || []).map(out => (out.title || '')),
            };
            jobDesc.qualification = {
                behavior: ((qualification || [])['behavior'] || []).map(be => (be.title || '')),
                soft_skills: ((qualification || [])['soft_skills'] || []).map(so => (so.title || '')),
                hard_skills: ((qualification || [])['hard_skills'] || []).map(ha => (ha.title || '')),
                language: ((qualification || [])['language'] || []).map(la => (la.title || '')),
                computer_knowledge: ((qualification || [])['computer_knowledge'] || []).map(co => (co.title || '')),
            };
            jobDesc.direct = ((management || [])['direct'] || []).map(dire => (dire.title || ''));
            jobDesc.indirect = ((management || [])['indirect'] || []).map(indire => (indire.title || ''));
            jobDesc.substitute = ((management || [])['substitute'] || []).map(subs => (subs.title || ''));
            jobDesc.manage = ((management || [])['manage'] || []).map(mana => (mana.title || ''));
            return jobDesc;
        }

        if(!title || title === ''){
            return res.json({success: false, msg: locale("company_routers_all.position_goal_empty")});
        }
        // if(!description || description === ''){
        //     return res.json({success: false, msg: locale("company_routers_all.slider_not_found")});
        // }
        // if(
        //     !duties ||
        //     (duties || []).length === 0 ||
        //     (duties || []).some(dut =>
        //         !dut.title ||
        //         dut.title === '' ||
        //         (dut.list || []).some(li =>
        //             !li.title ||
        //             li.title === '' ||
        //             li.repetition === ''
        //         )
        //     )
        // )
        // {
        //     return res.json({success: false, msg: locale("company_routers_all.position_duties_empty")});
        // }
        // if(!qualification || (Object.values(qualification || {}) || []).every(qual => (qual || []).length === 0)){
        //     return res.json({success: false, msg: locale("company_routers_all.position_skills_empty")})
        // }
        if(_id && _id !== '' && isId(_id)){
            JobDescription.findOne({_id: _id, company: req.company._id, status: 'active'}).exec(function(err, jobDesc){
                if(err){
                    winsErr(req, err, 'JobDescription.find() - edit');
                    return res.json({success: false, msg: `${locale("system_err")} 1`});
                }
                if(jobDesc){
                    jobDesc.edited = [...jobDesc.edited,
                        {
                            date: new Date(),
                            by: {emp: req.employee._id, user: req.employee.user}
                        }
                    ];
                    getObject(jobDesc).save((err, jobDesc) => {
                        if(err){
                            winsErr(req, err, 'JobDescription.save() - edit');
                            return res.json({success: false, msg: `${locale("system_err")} 2`});
                        }
                        return res.json({success: true, jobDescription: jobDesc, _id: _id})
                    })
                }else{
                    return res.json({success: false, msg: locale("company_routers_all.position_definition_empty")});
                }
            });
        }else{
            let jobDescription = new JobDescription();
            jobDescription.company = req.company._id;
            getObject(jobDescription).save((err, jobDesc) => {
                if(err){
                    winsErr(req, err, 'JobDescription.save() - create');
                    return res.json({success: false, msg: locale("system_err")});
                }
                return res.json({success: true, jobDescription: jobDesc})
            })
        }
    });
    router.get('/get/jobDescriptions', (req, res, next) => auth.company(req, res, next, []), function(req, res){
        JobDescription.find({company: req.company._id, status: 'active'}).lean().exec(function(err, jobDesc){
            if(err){
                winsErr(req, err, 'JobDescription.find() - get');
                return res.json({success: false, msg: `${locale("system_err")} 1`});
            }
            let temp = (jobDesc || []).map(jobDes => jobDes._id);
            Roles.find({jobDescription: {$in: temp}, status: 'active'}).lean().exec(function (err, roles) {
                if(err){
                    winsErr(req, err, 'Role.find() - get jobDescription');
                    return res.json({success: false, msg: `${locale("system_err")} 2`});
                }
                temp = (jobDesc || []).map(jobDes => {
                    let tempSaved = [];
                    roles.map(role => {
                        if(((role || {}).jobDescription || '').toString() === (jobDes._id || 'as').toString()){
                            tempSaved.push(role);
                        }
                    });
                    return { ...jobDes, role: tempSaved};
                })
                return res.json({success: true, jobDescriptions: temp})
            });
        });
    });
    router.post('/delete/jobDescriptions', (req, res, next) => auth.company(req, res, next, []), function(req, res){
        const {_id} = req.body;
        JobDescription.findOne({_id: _id, company: req.company._id, status: 'active'}).exec(function(err, jobDesc){
            if(err){
                winsErr(req, err, 'JobDescription.find() - delete');
                return res.json({success: false, msg: `${locale("system_err")} 1`});
            }
            if(jobDesc){
                Roles.find({company: req.company._id, status: 'active', jobDescription: _id}).exec(function (err, roles) {
                    if(err){
                        winsErr(req, err, 'Roles.find() - delete jobDescription');
                        return res.json({success: false, msg: `${locale("system_err")} 2`});
                    }
                    if(roles && roles.length > 0){
                        return res.json({success: false, msg: locale("company_routers_all.role_found_job_description")});
                    }else{
                        jobDesc.status = 'deleted';
                        jobDesc.save((err, saved) => {
                            if(err){
                                winsErr(req, err, 'JobDescription.save() - delete');
                                return res.json({success: false, msg: `${locale("system_err")} 3`});
                            }
                            return res.json({success: true, _id: _id});
                        });
                    }
                })
            }else{
                return res.json({success: false, msg: locale("company_routers_all.job_description_not_found")});
            }
        });
    });
    router.post('/submit/reference', (req, res, next) => auth.employee(req, res, next), function(req, res){
        const {text, _id, final} = req.body;
        if(final && !text){
            return res.json({success: false, msg: locale("company_routers_all.reference_letter_should_not_be_empty")});
        }
        Reference.findOne({status: 'pending', _id: _id}).exec(function(err, reference){
            if(err){
                if(final){
                    return res.json({success: false, msg: `${locale("system_err")} 1`});
                }else{
                    return res.json({success: false});
                }
            }
            if(reference){
                if(final){
                    reference.status = 'finished';
                }
                reference.text = text;
                reference.save((err, saved) => {
                    if(err){
                        if(final){
                            return res.json({success: false, msg: `${locale("system_err")} 2`});
                        }else{
                            return res.json({success: false});
                        }
                    }
                    if(final){
                        return res.json({success: true, final: true, _id: _id || saved._id});
                    }else{
                        return res.json({success: true, _id: _id || saved._id, text: text, final: false});
                    }
                });
            }else{
                if(final){
                    return res.json({success: false, msg: locale("company_routers_all.reference_letter_not_found")});
                }else{
                    return res.json({success: false});
                }
            }
        });
    });
};