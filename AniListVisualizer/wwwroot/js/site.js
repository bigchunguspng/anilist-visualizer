class Toggler
{
    static FindById(id)
    {
        return new Toggler(document.getElementById(id));
    }

    constructor(toggler)
    {
        this.a = toggler.getAttribute("a");
        this.b = toggler.getAttribute("b");
        this.t = toggler;
    }

    toggle()
    {
        this.t.setAttribute("a", this.b);
        this.t.setAttribute("b", this.a);
    }

    setText(text)
    {
        this.t.innerText = text;
    }
}

function delay(milliseconds)
{
    return new Promise(resolve =>
    {
        setTimeout(resolve, milliseconds);
    });
}

function ToggleInnerHTML(target_selector, toggle_id)
{
    let toggler = Toggler.FindById(toggle_id);

    document.querySelectorAll(target_selector).forEach(x => x.innerHTML = x.getAttribute(toggler.b));

    toggler.toggle();
    return toggler;
}

function ReverseList(target_id)
{
    let target = document.getElementById(target_id);
    let children = target.children;
    let i = children.length;

    while (i--) target.appendChild(children[i]);
}