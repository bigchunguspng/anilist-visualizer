function delay(milliseconds)
{
    return new Promise(resolve => { setTimeout(resolve, milliseconds); });
}

function ToggleInnerHTML(target_class, toggle_id)
{
    let targets = document.getElementsByClassName(target_class);
    let toggler = document.getElementById(toggle_id);
    let a = toggler.getAttribute("a");
    let b = toggler.getAttribute("b");

    for (const target of targets)
    {
        target.innerHTML = target.getAttribute(b);
    }
    toggler.setAttribute("a", b);
    toggler.setAttribute("b", a);
}

function ReverseList(target_id)
{
    let target = document.getElementById(target_id);
    var children = target.childNodes;
    var i = children.length;

    while (i--) target.appendChild(children[i]);
}