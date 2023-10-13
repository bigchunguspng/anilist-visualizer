function SwitchLanguage()
{
    let text = ToggleInnerHTML('title', 'lang');
    document.getElementById('lang').innerText = text == "english" ? "English" : "日本語";
}

function ChangeOrder()
{
    let toggler = document.getElementById('reverse');
    let a = toggler.getAttribute("a");
    let b = toggler.getAttribute("b");

    ReverseList("animanga");

    toggler.setAttribute("a", b);
    toggler.setAttribute("b", a);
}

function ToggleGrouping()
{
    let toggler = document.getElementById('group');
    let a = toggler.getAttribute("a");
    let b = toggler.getAttribute("b");

    if (a == "default")
    {
        GroupElements();
        toggler.innerText = "Restore";
    }
    else
    {
        UngroupElements();

        let reverse = document.getElementById('reverse');
        if (reverse.getAttribute("a") != "default")
        {
            ReverseList("animanga");
        }
        toggler.innerText = "Group";
    }

    toggler.setAttribute("a", b);
    toggler.setAttribute("b", a);
}

function GroupElements()
{
    let target = document.getElementById("animanga");
    let children = target.children;

    let series = new Set();

    for (let i = 0; i < children.length; i++)
    {
        series.add(children[i].attributes["series"].value);
    }

    let hr = document.createElement("hr");

    for (const group of series)
    {
        let items = document.querySelectorAll(`#animanga [series='${group}']`);
        if (items.length > 1)
        {
            for (let j = items.length - 1; j >= 0; j--)
            {
                target.insertBefore(items[j], items[(j + 1) % items.length]);
            }
        }
        let next = items[items.length - 1].nextSibling;
        target.insertBefore(hr.cloneNode(), next);
    }

    document.querySelector("#animanga hr:last-child").remove();
}

function UngroupElements()
{
    document.querySelectorAll("#animanga > hr").forEach(x => x.remove());

    let target = document.getElementById("animanga");
    let children = target.children;

    for (let i = 0; i < children.length; i++)
    {
        let element = document.querySelector(`#animanga .entry[n='${i}']`);
        target.appendChild(element);
    }
}