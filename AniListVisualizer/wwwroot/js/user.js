function SwitchLanguage()
{
    let lang = ToggleInnerHTML('#animanga .entry .title', 'lang');
    lang.setText(lang.a === "english" ? "English" : "日本語");
}

function ChangeOrder()
{
    let toggler = Toggler.FindById("reverse");

    ReverseList("animanga");

    toggler.toggle();
}

function ToggleGrouping()
{
    let toggler = Toggler.FindById("group");
    if (toggler.a === "default")
    {
        GroupElements();
        toggler.setText("Restore");
    }
    else
    {
        UngroupElements();
        toggler.setText("Group");

        if (Toggler.FindById("reverse").a !== "default")
        {
            ReverseList("animanga");
        }
    }
    toggler.toggle();
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