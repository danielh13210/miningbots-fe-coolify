export function map(array,f) {
    let output=[];
    array.forEach(element => {
        output.push(f(element));
    });
    return output;
}

export function object_forEach(object,f){
    Object.keys(object).forEach((key)=>{
        f(key,object[key]);
    });
}

export function indexed_foreach(array,f){
    for(let i=0;i<array.length;i++){
        f(i,array[i]);
    }
}

export function object_map(object,f){
    let array=[];
    object_forEach(object,(key,value)=>{
        array.push(f(key,value));
    });
    return array;
}

export function object_map_values(object,f){
    let target=Object.assign({},object);
    object_forEach(object,(key,value)=>{
        target[key]=f(key,value);
    });
    return target;
}

// helper to create a subscope for intermediate values, without passing any arguments
export function in_private_scope(f){
    return f();
}

// helper to create a subscope for intermediate values
export function with_value(value,f){
    return f(value);
}