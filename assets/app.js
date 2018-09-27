"use strict";

// get the list of orders from an API
var apiData = (function(){
    function getOrder(options,callback){
        return getOrders(options,callback)
    }
    function getOrdersAwaitingDispatch(callback){
        return getOrders({type: 11}, callback)
    }

    // mock api return
    //--------------------------------------------------
    function getAll(){
        return [
            {order_id:1231, date:1537529718, customer:'France, J'},
            {order_id:1232, date:1537441318, customer:'Jones, A'},
            {order_id:1233, date:1537443318, customer:'Smith, T'},
            {order_id:1234, date:1537329718, customer:'Davies, S'},
            {order_id:1235, date:1537229718, customer:'Roberts, E'},
            {order_id:1236, date:1537129718, customer:'McEldon, S'},
            {order_id:1237, date:1537029718, customer:'Francis, F'},
            {order_id:1238, date:1536829718, customer:'Jones, R'},
            {order_id:1239, date:1536729718, customer:'Donadson, P'},
            {order_id:1240, date:1536529718, customer:'Tompkins, L'}
        ]
    }
    function get(order_id){
        let orders = getAll()
        for(let order in orders){
            if (orders[order].order_id == order_id) return orders[order]
        }
        return {}
    }
    //--------------------------------------------------

    // search data for result
    // by - options.order_id
    function getSingleOrder(options, callback){
        let data = [],
            order_id = options.order_id || null
        
        data = get(order_id)
        // allow for callbacks to be passed 
        if (typeof callback == 'function') {
            try{
                callback(data)
            }catch(e){
                throw 'callback not successful in call to API::getSingleOrder()'
            }
        }else{
            return data
        }
    }
    function getOrders(options, callback){
        let data = []
        options = options || { action:'getAll' }

        // connect to api with the given options
        switch(options.action){
            case 'getAll':
                data = getAll()
                break;
            case 'get':
                data = get(options)
                break;
            default: data = getAll()
        }
        // allow for callbacks to be passed 
        if (typeof callback == 'function') {
            try{
                callback(data)
            }catch(e){
                throw 'callback not successful'
            }
        }else{
            return data
        }
    }
   
    function init(callback){
        return getOrdersAwaitingDispatch(callback)
    }
    return{
        init: init,
        getAll: getOrdersAwaitingDispatch,
        get: getSingleOrder
    }
}());

// common to all code 
var list = (function(){
    // html to repeat for each order
    var template = document.querySelector('template#list-item').innerHTML
    // container to store the list
    var container = document.getElementById('list')
    function updateCounter(){
        var count = container.childElementCount
        // document.getElementById('count').innerText = count
        //@todo: trigger events to manage list counter
    }
    return{
        template: template,
        container: container,
        counter: updateCounter
    }
}());

// manage notifications 
var notify = (function(draggable){
    var notifyTimeoutIndex = void 0,
        footer = document.getElementById('footer'),
        status = footer.querySelector('#status'),
        delay = 4000

    function setText(text){
        status.innerHTML = text
    }
    function add(text){
        footer.classList.add('open')
        setText(text)
        notifyTimeoutIndex = setTimeout(function(){
            clear()
        }, delay)
        list.counter()
    }
    function clear(){
        clearTimeout(notifyTimeoutIndex)
        footer.classList.remove('open')
        setTimeout(function(){
            status.innerHTML = ''
        },200)
    }
    function getContainerElement(){
        return footer
    }
    return {
        add: add,
        set: setText,
        clear: clear,
        getContainer: getContainerElement
    }
})();



var draggable = (function () {
    // DRAGGABLE

    // make each list item draggable
    var lastPosX = 0,
        isDragging = false,
        hasSwiped = false,
        hasSwipedLeft = false,
        hasPassedTippingPoint = false,
        swipeThreshold = 2.2,
        delay = false,
        offset = 25,
        tippingPointDivisor = 3

    function init(container,options){
        for (let i in options){
            if(i=='delay') setDelay(options[i])
        }

        let nodeList = container.querySelectorAll('.draggable')
        
        // hammerjs event touch only listeners
        nodeList.forEach(function(elem){
            let mc = new Hammer(elem,{
                // inputClass: Hammer.TouchInput // touch device only
            });
            mc.add( new Hammer.Pan({ direction: Hammer.DIRECTION_HORIZONTAL, threshold: 0 }));
            mc.on("pan", handleDrag);
        })
        // clicking a swiped order is the undo 
        // cancel the order state change
        container.addEventListener('click',onCloneUndo)
        
        // undo button in notification area
        // would not fire off if the notify code is unavailable
        if(!(notify && notify.getContainer && typeof notify.getContainer == 'function')) {
            throw "Notify module not available!";
        }
        notify.getContainer().addEventListener('click', function(event){
            try{
                onStatusUndo(event)
            }catch(e){
                console.log(e)
            }
        })
    }
    function setDelay(_delay){ delay = _delay }

    // on click of the row once swipe detected
    function onCloneUndo(event){
        var btn = getClosest(event.target,'.undo-btn')
        if (btn){
            var parent = getClosest(btn, '.draggable')
            var clone = parent.querySelector('.clone')
            resetClone(clone)
        }
    }
    // on click of the undo button in the footer
    function onStatusUndo(event){
        if (!list) throw 'List component not available!'
        let btn = getClosest(event.target,'.undo-btn')
        if (!btn) throw 'Undo button data not available!'
        let order_id = btn.dataset.order_id

        if (order_id){
            var row = list.container.querySelector('[data-order_id="'+order_id+'"]')
            if(row){
                var clone = row.querySelector('.clone')
                resetClone(clone)
            }else{
                apiData.get({order_id:order_id}, function(order){
                    if(order.length==0) throw "order_id is not available"
                    try{
                        orders.update(order)
                        notify.set('Reset #'+order_id)
                        setTimeout(function(){
                            notify.clear()
                        },400)
                    }catch(e){
                        console.log(e)
                    }
                })
            }
        }else{
            throw 'order_id is empty!'
        }
    }

    function handleDrag(event) {
        var parent = getClosest(event.target, '.draggable')
        // DRAG STARTED
        var clone = void 0
        if (parent.classList.contains('cloned')){
            clone = parent.querySelector('.clone')
        } else {
            clone = cloneDraggable(parent)
        }
        if (clone) {
            if ( ! isDragging ) {
                isDragging = true;
                lastPosX = clone.offsetLeft;
                hasSwiped = false
                hasSwipedLeft = false
                hasPassedTippingPoint = false
                clone.classList.remove('animate-fast')
            }
            // move draggable element currentPos + delta
            clone.style.left = event.deltaX + lastPosX + 'px';
            // record if the speed of the mouse drag makes it a "swipe"
            hasSwiped = Math.abs(event.velocity)>swipeThreshold
            // negative numbers indicate movement to the left
            hasSwipedLeft = event.deltaX < 0 || event.velocity < 0
            // record if the drag position passes the point where an action is recorded
            hasPassedTippingPoint = Math.abs(event.deltaX)>clone.offsetWidth/tippingPointDivisor

            // console.log(JSON.stringify({
            //     tippingPoint: clone.offsetWidth/tippingPointDivisor,
            //     deltaX: event.deltaX,
            //     hasPassedTippingPoint: hasPassedTippingPoint,
            //     hasSwiped: hasSwiped,
            //     hasSwipedLeft: hasSwipedLeft
            // }))

            // change the body colour on drag passed tipping point
            document.querySelector('body').classList.toggle('bg-light',hasPassedTippingPoint)
            if(hasSwipedLeft){
                parent.classList.remove('list-group-item-secondary','list-group-item-success')
                parent.classList.add('list-group-item-danger')
            }else{
                parent.classList.remove('list-group-item-secondary','list-group-item-danger')
                parent.classList.add('list-group-item-success')
            }
            
            
            // DRAG ENDED
            if (event.isFinal) {
                if (hasSwiped || hasPassedTippingPoint) {
                    // continue the animation far left or far right
                    var width = clone.offsetWidth - offset
                    clone.classList.add('animate-fast')
                    clone.style.left = (hasSwipedLeft ? -Math.abs(width) : width)+'px'

                    deleteRow(parent)
                }else{
                    try{
                        resetClone(clone)
                    }catch(e){
                        console.log(e)
                    }
                }
                // reset the variables
                isDragging = false;
                hasSwiped = false
                hasSwipedLeft = false
                hasPassedTippingPoint = false
                
                document.querySelector('body').classList.remove('bg-light')
            }
        }
    }
    function resetClone(clone){
        // remove clone after resetting the position
        if(!clone) throw 'Error re-setting draggable element'

        clone.classList.remove('animate-fast')
        clone.classList.add('animate')
        clone.style.left = 0
        var parent = clone.parentNode
        clearTimeout(parent.dataset.timeout)
        notify.set('Reset #'+parent.dataset.order_id)
        
        setTimeout(function(){
            let clone = parent.querySelector('.clone')
            if(clone){
                parent.removeChild(clone)
                parent.classList.remove('cloned','list-group-item-secondary','list-group-item-danger','list-group-item-success')
            }
            notify.clear()
        },400)
    }

    function deleteRow(row){
        var container = row.parentNode,
            btn = document.createElement('a')

        btn.classList.add('btn','btn-outline-light','undo-btn')
        btn.dataset.order_id = row.dataset.order_id
        btn.innerText = 'Undo #'+btn.dataset.order_id

        let state = row.classList.contains('list-group-item-success') ? 'Dispatched' : 'Partially Shipped'
        notify.add('Order '+state+' '+btn.outerHTML)
        list.counter()
        if(delay){
            row.dataset.timeout = setTimeout(function(){
                row.classList.remove('cloned')
                if(container && container.contains(row)) container.removeChild(row)
                orders.delete(row.dataset.order_id)
            },delay)
        }
    }

    function cloneDraggable(parent){
        if(!parent.classList.contains('cloned')) {
            var elem = parent.cloneNode(true)
            elem.classList.add('clone','position-absolute')
            elem.classList.remove('draggable','position-relative')
            parent.classList.add('cloned','list-group-item-secondary','undo-btn')
            parent.appendChild(elem)
        }
    }

    return{
        init: init,
        setDelay: setDelay
    }
})();



// create the orders interface while passing the "draggable" interface
var orders = (function(draggable){
    var orders = void 0
    var marked_orders = void 0
    function showOrders(container,template,options){
        container.innerHTML = ''
        // add <template>
        // for each order create a list item
        orders.forEach(function(order){
            // create temp element to store the markup
            let elem = document.createElement('div')
            // get the markup from the <template> and alter the contents
            elem.innerHTML = template
            addText(elem,'order_id','#'+order.order_id)
            addText(elem,'date',moment.unix(order.date).fromNow())
            addText(elem,'customer',order.customer)
            addTitle(elem,'date',moment.unix(order.date).format('L LTS'))
            // add to dom
            let appended = container.appendChild(elem.firstElementChild)
            // dataset items dont work unless the element is in the DOM (I think?)
            appended.dataset.order_id = order.order_id
        })
        try{
            draggable.init(container,options.draggable)
        }catch(e) {
            console.log(e)
        }
    }
    
    function addText(parent,key,value){
        parent.querySelectorAll('[data-key="'+key+'"]').forEach(function(element){
            element.innerText = value
        })
    }
    function addTitle(parent,key,value){
        parent.querySelectorAll('[data-key="'+key+'"]').forEach(function(element){
            element.title = value
        })
    }
    function getOrders(){
        return orders || {}
    }
    function set(_orders){
        // @todo: validate/sort _orders...
        orders = _orders
        return orders
    }
    function removeOrder(order_id){
        for(let index in orders){
            if(orders[index].order_id == order_id) orders.splice(index, 1);
        }
        return orders
    }
    function update(order){
        let _orders = getOrders()
        let index = 0
        // @todo: splice to the correct index (the one it was in before ideally, or just re-sort)
        _orders.splice(index, 0, order)
        orders = set(_orders)
        showOrders(list.container,list.template,{})
        return orders
    }
    function init(data,options){
        if (!data) throw "No orders passed";

        let container = list.container
        if (!container) throw "DOM Element 'container' missing";
        let template = list.template
        if (!template) throw "<template> html not added";
        
        orders = set(data)
        showOrders(container,template,options)
        return orders
    }
    return{
        init: init,
        get: getOrders,
        set: set,
        update: update,
        delete: removeOrder
    }
}(draggable));


//bring it all together
var app = (function(){
    var options = {
        draggable: {
            delay: 2000
        }
    }
    // ui options
    var cleanup = document.getElementById('cleanup')
    if(cleanup){
        cleanup.addEventListener('change', function(event){
            draggable.setDelay(cleanup.checked ? options.draggable.delay : false)
        })
    }
    //initialize the other modules
    function init(){
        apiData.init(function(data){
            try{
                orders.init(data,options)
            } catch (e) {
                console.log(e)
            }
        })
    }
    return {
        init: init
    }
}());
//==============================================================================
// ALL THE MODULES INIT DONE HERE


// Download the data
// on success the orders will be displayed
// the drag event will be added to each list item

app.init()

//==============================================================================


// UTILITIES

// traverse up DOM till selector is found - return found element
var getClosest = function (elem, selector) {
	for ( ; elem && elem !== document; elem = elem.parentNode ) {
		if ( elem.matches( selector ) ) return elem;
	}
	return null;
};

// add forEach to NodeList
NodeList.prototype.forEach = Array.prototype.forEach;

