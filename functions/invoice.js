var moment = require('moment');

module.exports =  async function invoice(db) {
    try {
        const payments = await db.payments.findAll({limit: 1, order: [['createdAt']]});

        const last = payments[0] || null;
       
        if(last != null) {
            const lastDate = moment(last.createdAt).format('YYYY-MM-DD')
            const currentDate = moment(new Date()).format('YYYY-MM-DD')

            if(moment(lastDate).isSame(currentDate)) {
                console.error('double statistics invoice')
                return 
            } 
        }
    } catch (error) {
        console.log(error)
    }
    
            try {
            const operators = await db.operators.findAll({where: {status: 1}});
            const users = await db.users.findAll({where: {status: 1}});
            const packages = await db.packages.findAll();
            let summary = [];
            
            for(let i = 0; i < operators.length; i++) {
                let userOperators = users.filter(u => u.operatorId == operators[i].id ).map(u => {
                    return {
                        ...u,
                        price: packages.find(p => p.id == u.packageId).price || 0
                    }
                })
                let amount;
                if(userOperators.length > 1) {
                    amount = userOperators.reduce((acc, value,i ) => {
                        return i == 1? acc.price + value.price : acc + value.price;
                    });
                } else if( userOperators.length == 1) {
                    amount = userOperators[0].price
                } else {
                    amount = 0;
                }
                 
                summary.push({operatorId: operators[i].id, price: amount})
               
            }
            await db.payments.bulkCreate(summary)
            } catch(err) {
                console.log(err)
            }
            
}