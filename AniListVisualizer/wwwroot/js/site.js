function SetInnerHTML(obj, value) {
    obj.innerHTML = value;
}

function ToggleInnerHTML(class_name, toggle_id) {
    let elements = document.getElementsByClassName(class_name);
    let toggle = document.getElementById(toggle_id);
    let off = toggle.getAttribute("off");
    let on = toggle.getAttribute("on");
    for (const element of elements) {
        SetInnerHTML(element, element.getAttribute(off));
    }
    toggle.setAttribute("on", off);
    toggle.setAttribute("off", on);
}