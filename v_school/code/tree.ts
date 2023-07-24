// 
//Resolve the baby/popup class used by the exploer window 
import * as outlook from "../../../outlook/v/code/outlook.js";
//
//Resolve references to the io
import * as io  from "./io.js";
//
//Resolve the layouts for saving
import * as quest from "./questionnaire.js";
//
//Resolve mutall_error class
import * as schema from "./schema.js";
//
//To resolve the server methods
import * as server from "./server.js";

//Resolve reference to ifuel
import * as lib from "./library.js";

//To resole access to tge geral html
import * as app from "../../../outlook/v/code/app.js";

// 
//Export the following classes from this module 

//Path is list of slash separated strings, e.g., d:/tracker/v/code/test.js. It is used
//for formulating a universal id for nodes -- regardless of content type
export type path = string;
//
//The shape of the data that can be used to specify is an array of identifiers that
//specify a path to tehe desired node. The root is equivalent to an empty list. \
//It is used for specifying:-
//- input: a desired tree view, e.g., when we initially open the tree
//- output: the desired output from a selection
export type selection = Array<string>;

// Subject of data management
export interface subject {
    //
    //The name of the database where the data resides
    dbname: schema.dbname, 
    //
    //The name of the table where the data resides in teh database
    ename: schema.ename
}

//The properties of some content are displayed in both in the tree and list 
//table. It is an indexed array (i.e., or object) of basic values. This is a
//more powerful representation than the array of key/values pairs approach
export type properties = {[index:string]:lib.basic_value};

//Modeling various ways of viewing a node, notably tree and list views.
abstract class node_view extends outlook.view{
    //
    //Class to manage nodes that are common to both tree and list viewa
    constructor(
        //
        //The name of this node
        public name:'list'|'tree',
        //
        //The node whose view is being considered
        protected node:node,
        //
        //The element that contains all the sub-elements of a node in this view.
        public root:HTMLElement,
        //
        //The selection element of a node. It is used for indexing this node, thus
        //bridging the gap between the view and this logical presentation of a node.
        //It is set during the construction of a class derived from this one
        public selector:HTMLElement,
        //
        //The element where we will hook the root, i.e., that the root node will be a child 
        //of. In the case of tree view, this is the children element of the parent node. In
        //the case of list view, is is the tbody of the list view . The exact placement of
        //the root in the hook is determined by the node's anchor.
        public hook:HTMLElement
    ){
        //Initialize the outlook view
        super();
        //
        //Ensure that the view is visible.
        this.review();

    }

    //Returns the explorer of this node view
    public get explorer(){return this.node.explorer; }     

    
    //
    //Detach this view from its parent
    public delete(){
        //
        //Every view has a root element; get its  parent
        const parent = this.root!.parentNode; 
        //
        //There must be a parent to the root element -- unless you are trying to delete the
        //root node
        if (parent===null)
            throw new schema.mutall_error(`The root element for node ${this.node.id} cannot be deleted`);
        //
        //Detach the root from the parent
        parent.removeChild(this.root!);
    }

    //Reviewing a node means ensuring that the node is visible in its expected
    //place -- depending on the current view
    public review():void{
        //
        //Get the exact, i.e., primitive, anchorage of the node veing viewed
        const {placement, ref} = this.get_primitive_anchor();
        //
        //Effect the placement of the root element, following the anch specifications
        this.insert_or_append_element(placement, ref);
        //
        //Scroll the selector element into view
        this.selector.scrollIntoView();
    }

    //Returns how the node in this view is attached relative its
    //parent or sibblings
    private get_primitive_anchor():{placement:insert_operation, ref:HTMLElement}{
        //
        //If the node has an anchor use it to formulate a primitive version
        if (this.node.anchor !== undefined) {
            //
            //Destructure the anchor to reveal placement and reference node specs.
            const{placement, reference} = this.node.anchor;
            //
            //Get the hook element of the reference node, depending on this view
            let ref:HTMLElement;
            //
            //The reference element depends on the candidate node is placed
            switch(placement){
                //
                //Appending is  specified in terms of where this  node will be hooked.
                case "append_child": ref = reference[this.name]!.hook; break;
                //
                //Insert before or after is specified in terms of siblings. 
                case "insert_after":
                case "insert_before":ref = reference[this.name]!.root;    
            }
            //
            return {placement, ref};
        }
        //
        //If a node has no special placement, then it will be a child of some element
        const placement:insert_operation = "append_child";
        //
        //
        //If the node has a parent...
        if (this.node.parent!==undefined){
            //
            //..then its reference is the root of the parent node
            const ref:HTMLElement = this.hook;
            //
            //Return the primitive anchor
            return {placement, ref};
        };
        
        //
        //A root node, i.e., one that has no parent, is anchored to the tree
        //view element of the explorer
        //
        //If the tree panel is not yet defined, there must be a problem
        if (this.node.explorer.panel.tree===undefined) throw new schema.mutall_error('The tree element is not yet set');
        //
        //Get the explorer's tree view  element as teh reference
        const ref = this.node.explorer.panel[this.name]!;
        //
        //Return the anchor
        return {placement, ref};
    }

    //Insert the given candidate element before or after (or append as a child to) the referenced 
    //element
    private insert_or_append_element(placement:insert_operation, ref:HTMLElement):void{
        //
        //Get teh candidate element that is being inserted. It is the root of this view.
        const candidate:HTMLElement = this.root;
        //

        //
        //Insert or append the candidate node relative to a reference node
        switch(placement){
            //
            //Append the candidate  to the reference element as a child
            case 'append_child': ref.appendChild(candidate); break;
            //
            //Insert the new new node as a sibbling    
            case'insert_after':
            case 'insert_before':
                //
                //Get the parent of the reference
                const parent = ref.parentNode;
                //
                //It is an error if there is no parent
                if (parent === null) 
                    throw new schema.mutall_error(`No parent found for node ${ref.id}`);
                //
                if (placement ==='insert_before')
                    //
                    //Place the root before the reference
                    parent.insertBefore(candidate, ref);
                else {
                    //
                    //Insert the root after the reference. There is no insertAfter() function. 
                    //So re-use insert before, using the next sibbling
                    //
                    //Get the next sibbling of the reference
                    const sibbling = ref.nextElementSibling;
                    //
                    //Append to the parent if there is no sibbling
                    if (sibbling === null)
                        //
                        //Append the root as a child of the parent
                        parent.appendChild(candidate);
                    //     
                    else //Place the root before the sibbling
                        parent.insertBefore(sibbling, candidate);
                }
            break;            
        }
    }


    //Mark the node in this view as hovered on.
    mark_as_hovered():void{
        //
        //Returns the explorer's panel elemnent, that matches this view
        const panel =this.node.explorer.panel[this.name]!;
        //
        //Ensure that this vie's selector is the only one marked as hovered on in 
        //the panel
        this.node.explorer.select(panel, this.selector, 'hovered');
    }

}

//Cass to support management of the list view elements and other associated 
//properties
class list_view extends node_view{
    //
    //Override the general selector . For a list view, it is a table row element that 
    //represents this node in the list view.
    declare public selector:HTMLTableRowElement;
    //
    constructor(
        //
        //The node whose view is being considered
        node:node,
        //
        //The list table that is being constructed
        public list_table:list_table
    ){
        //
        //Create the root and hook  elements of a list view
        const {root, hook} = list_view.get_list_view_elements(node, list_table);
        //
        //Initialize the view named list. Note that the selector of a list view is the 
        //same as the root. 
        super('list', node, root, root, hook);
    }

    //Restore the list view selector, after aborting an update
    restore():void{
        //
        //Selector is a tr. Get its tds and loop over each one of them
        Array.from(this.selector.cells).forEach(td=>{
            //
            //Get the matching io
            const Io = io.io.get_io(td);
            //
            //Restore the io
            Io.restore();
        }); 
    }
 
     //Returns the table row (as the root) and other associated elements for this
     // list view
     static  get_list_view_elements(node:node, list_table:list_table):{
        root:HTMLTableRowElement,
        hook:HTMLElement
    }{
        //
        //Only nodes that have a parent are considered
        if (node.parent===undefined) throw new schema.mutall_error('Only nodes that have a parent are considered')
        //
        //Get the parent tbody from the list table being constructed
        const tbody = list_table.tbody;
        //
        //Create a tr anchored in the body; remember to link it to this node
        //via an id and to the various interaction listeners.
        const tr:HTMLTableRowElement = node.explorer.create_element("tr", tbody, {
            //
            //The node/list view link
            id:node.id,
            //
            //On clik, mark this node as selected in the list view, i.e., remove 
            //any selection from the list panel and select this node
            onclick: ()=>node.explorer.select(node.explorer.panel.list!, tr),
            //
            //Select and open this node, if double clicked on
            ondblclick:()=>{
                //
                //Show the children in the tree view
                node.tree.open();
                //
                //Select this node in the tree panel 
                node.explorer.select(node.explorer.panel.tree!, node.tree.selector);
            },
            //
            //Select and perform a CRUD operation on this node and dont open 
            //the context menu
            oncontextmenu: async(evt)=>{
                //
                //Try all these  possibilities to switch off the default context 
                //menu
                //evt.stopPropagation();
                //evt.stopImmediatePropagation;
                evt.preventDefault();
                //
                await node.crud();
            },
            //
            //On hovering this node in the list view, mark it as hovered on, 
            //otherwise remove the hover
            onmouseover:()=> {if (node.list!==undefined) node.list.selector.classList.add('hovered'); },
            onmouseout:()=> {if (node.list!==undefined) node.list.selector.classList.remove('hovered'); }
        });
        //
        //By default, view this tr (row) in normal mode (as opposed to edit
        //mode)
        tr.classList.add('normal'); 
        //
        //There are as many row columns in the tr as there are header names. The header is derived
        //from the node that is the parent of this one
        list_table.names.forEach(name=>{
            //
            //Create a table cell element, td
            const td:HTMLTableCellElement = node.explorer.create_element("td", tr, {
                //
                //Mark the td as the only selected one in the list view (using a generalized
                // method impments in the view class)
                onclick: ()=>node.explorer.select(node.explorer.panel.list!, td)
            });
            //
            //Formulate an achor for the io
            //
            //The anchor's page is the node's explorer
            const page = node.explorer; 
            const anchor:io.anchor = {page, element:td};
            //
            //Create an io based on the content of this node, its property name, and the
            //current cell. The io is automatically saved in an indexed collection 
            //for further use.
            node.content.create_io(name, anchor);
        });
        //
        //Return the elements. The hook element of a list view is the tbody. It is where 
        //we hook the trs
        return {root:tr, hook:tbody};
    }    
}

//Modelling that table that is used in a list view
class list_table extends outlook.view{
    //
    //The table elements
    public table:HTMLTableElement;
    public thead:HTMLElement;
    public tbody:HTMLElement;
    //
    //A collection that indexes the header column positions of the children 
    //table by position
    public position_by_name:Map<string, number>;
        //
    //The names used as column headers
    public names:Array<string>;

    //??
    public selection?:selection;

    constructor(protected node:node){
        super();
        //
        //Get the explo
        //
        //Create the table element
        this.table  = this.create_element('table');
        //
        ///Create the tbody element
        this.tbody = this.create_element("tbody", this.table);
        //A. Create the header of the table
        //
        //Use the given node's content names to create a non-anchored list table.
        //
        //Add a header to the table
        this.thead = this.create_element("thead", this.table);
        //
        //Set the header column names. Let 'tagname' always be the first header
        this.names = ['tagname', ...this.node.content.get_header_names()];
        //
        //Create an map of (header) positions indexed by name
        this.position_by_name = new Map();

        //Paint the header names, and use them to index their relative positions
        this.names.forEach((name, position)=>{
            //
            //Use the name to create the header
            this.create_element("th", this.thead, {textContent:name});
            //
            //Index the position by name
            this.position_by_name.set(name, position);
        });
        //
        //Paint the table's body
        this.paint_body();
        
    }
    //
    //Paint the body section of a list view, driven the children of teh current 
    //content
    private paint_body(){
        //
        //Assume that the children of the node under review are set. It is an error
        //if this assumption is not met.
        if (this.node.children ===undefined) 
            throw new schema.mutall_error(`The children of the node must be set for this node to be listed`);
        //
        //Create an null table (matrix) with appropriate event listeners. It has
        //as many columns as the header names and as many table rows as there 
        //are children of this node. 
        this.node.children.forEach(child=>child.list = new list_view(child, this));
        //
        //Fill the table matrix with values by looping through all the children 
        //of the nodes and completing each row
        this.node.children.forEach(async(child, rowIndex)=>{
            //
            //Get the properties of the child
            const props = child.content.properties;
            //
            //Add the tagname of the child node
            props['tagname'] = child.content.name; 
            // 
            //Loop through all the properties of the child as key/value pairs
            //and fill the mating td's
            for (const key in props){
                //
                //Get the key value
                const value = props[key];
                //
                //Get the td that matches the property key. Remember to convert the
                //basic value of a key to a string.
                const cellIndex = this.position_by_name.get(String(key));
                //
                //If the cellIndex is not defined, something is wrong. Perhaps 
                //the column names do not match the data. You are probably using 
                //the wron header for the tabulating the children of this current
                //node
                if (cellIndex===undefined) 
                    throw new schema.mutall_error(`Column ${key} is not among ${this.names}`);
                //
                //Set the value at the given cell and row indices
                //
                //Get the referenced td
                const td = this.table.rows[rowIndex].cells[cellIndex]
                //
                //Get the io associated with this cell
                const Io = io.io.collection.get(td); 
                //
                //The io must exist, otherwise there is an issue
                if (Io===undefined) throw new schema.mutall_error(`IO for ${key} not found`);
                //
                //Set the io's value
                Io.value = value; 
            };
        });
    }


}

//Class to support management of the HTML tree view elements. It corresponds to the 
//following HTML fragment:-
/*
    <div class="root">
    <div class="header">
        <button class="expander" onclick="this.toggle('${this.name}')"
        >+</button>
        <div onclick="node.select(this) class='selector'>
            <img src="images/${this.icon}"/>
            <span>${this.name}</span>
        </div>
    </div>
    <div class="children hide">
        <!-- the children elements would be placed here when available -->
    </div>
</div>
*/
class tree_view extends node_view{
    //
    //The container for expander and selector
    public header:HTMLElement;
    //
    //The expander is the button/icon of a branch that shows if the branch is expanded
    //or contracted. It is also set when a node is created. A leaf node has no exepnder,
    //so its optional
    public expander?:HTMLElement;
    //
    //The children element is  where all the child elements of this node
    //are anchored
    public children:HTMLElement;
    //
    //Use the node whose view is being considered, to create this view
    constructor(node:node){
        //
        //Get the elements of a tree view, so that some of them can be passed
        //to the parent (e.g., root selector and hook)
        const {root, selector, header, expander, children, hook} = node.get_tree_view_elements() 
        //
        //Initialize the node view named tree
        super('tree', node, root, selector, hook);
        //
        //Save the elements to this object
        this.header = header;
        this.expander = expander;
        this.children = children;
    }

    //Toggling is about displaying the branch children (if they are hidden) or hiding
    //them if they are visible. In addition, the button's text content should change from
    //+ to - or vice versa
    public toggle():void {
        //
        //This operation is irrelevant for leaf nodes
        if (!this.node.content.is_branch()) return; 
        //
        //Make the children of this branch visible, if hidden; otherwise
        //hide them. That is what toggling is all about.
        if (this.children.hidden) this.open(); else this.close()
    }

    //
    //Opening a branch does a number of things, including:-
    //1. Creating the chidren of this node, if necessary
    //2. Unhiding them
    //3. Changing the branch expander content to -, in readiness for contracting
    //the branch
    public async open(selection?:selection):Promise<void>{
        //
        //Create/populate the children of this node if necessary. It is necessary 
        //if its children are undefined
        if (this.node.children ===undefined) {
            //
            //Use the given selection to create this node's children
            this.node.children = await this.node.create_children(selection);
        } 
        //
        //Unhide the children
        this.children.hidden = false;
        //
        //Change the expander to -, to indicate that all the children are 
        //visible
        if (this.expander!==undefined) this.expander.textContent = '-';
    }

    //
    //Closing a branch means 2 things:-
    //1. Hiding the children
    //2. Changing the branch expander content from to+
    private close():void{
        //
        //Hide the children of the branch
        this.children.hidden = true;
        //
        //Change the expander to + (or nothing if there are no children)
        const expander = this.node.children!.length>0 ? '+': '-';
        //
        //Change the expander button content
        if (this.expander!==undefined) this.expander.textContent = expander;
    }


    //Highlights the selected node on the tree panel panel and update the list
    //view.
    public async select():Promise<void>{
        //
        //Highlight this node in the tree view
        this.explorer.select(this.explorer.panel.tree!, this.selector);
        //
        //Select the content. By default thid doed nothing. We override this
        //behaviour to implement content-sensitive selection behaviour
        this.node.content.select(this);
        //
        //Continue the selection only if this is a branch
        if (!this.node.content.is_branch()) return;
        //
        //Set the children of the node, if necessary
        if (this.node.children===undefined) this.node.children=await this.node.create_children();
        //
        //Create a list panel that matches this node, from first principles 
        //and save the result for future paintings, if necessary.
        if (this.node.list_table===undefined) this.node.list_table = new list_table(this.node);
        //
        //Establish the link between this node's list view and the explorer
        //panel
        //
        //Get the explorer's list view panel
        const panel:HTMLElement =  this.explorer.panel.list!;
        //
        //Clear the list by detaching all the current children
        Array.from(panel.children).forEach(child => panel.removeChild(child));
        //
        //Relink this node's table as to be a child of the explorer's panel.
        panel.appendChild(this.node.list_table!.table);
    }

    //
    //The hook element of a tree view is the children element of the current
    // node's tree view
    get_hook_element():HTMLElement{
        return this.node.parent!.tree.children;
    }

    

}


//Node insert operations
type insert_operation = 'insert_after'|'insert_before'|'append_child';

//CRUD operations around a reference node. Other operations, such as,  
//cut, copy, paste, and rename can be built from the CRUD ones;
type crud_operation= insert_operation|'update'|'delete';

//The anchor of an element dermines where it is placed (logically and visually) relative
//to a reference one. 
type anchor = {
    //
    //This is how the new node will be placed.... 
    placement:insert_operation,
    //
    //...relative this reference one 
    reference:node
};

//Node is a class for modelling hierarchical data. It represents the visible 
//aspect of such data (unlike content). It was made necessary by the fact
//that we cannot extend the XML element, so that we can add our own methods for
//for managing tree-like data. Hence, we created our own that has similar 
//behaviour to an xml element but which we can extend in our own special ways. A
//node should be able to create elements, hence, it is an extension of a view
export class node extends outlook.view{
    //
    //The container for all the html elements that constitute the visible part 
    //of this node...
    //
    //...in the tree view. 
    public tree:tree_view;
    //
    //...in the list view. This is a table element that is initialized when a 
    //node is selected. Effectively it acts as a buffer to list view content, 
    //so that they don't always have to be created from first principals. The 
    //table has an associated collection of column positions indexed by 
    //their names, for use in filling up a table's body  
    public list?:list_view;
    //
    //A text identifier of a node, formed by prefixing the parents id with that of 
    //the current node that uniquely identifies a node independent of is content.
    //Hence the term univeral.It is used for indexing nodes
    get full_name():path{
        //
        //Get the parent's id
        const pid = this.parent===undefined ? "": this.parent.id;
        //
        //Return the id is the name of this node appended to the parent's id
        return `${pid}/${this.content.name}` 
    }
    //
    //The id of a node is an autogenerated string formed when a node is 
    //registered. It is used for linking the tree and list views.
    public id:string;
    //
    //The children of this node. They are set when a node is selected in the tree view, 
    //so that their properties can be shown in the list view. This is designed to be
    //consistent with the thinking around large data approach.
    public children?:Array<node>;
    //
    //A node has a list table that is set when the node is selected from the tree
    //view
    public list_table?:list_table;  
    //
    constructor(
        //
        //The content to be tree viewed
        public content:common.content,
        //
        //The view that that is the home of the target element. This allows the
        //node class to access view-based functionality. It also must support
        //the management of nodes, including their creation, review, update and deletion.
        //In future, we could define specific interface for this purpose, but for now, 
        //tree panel will suffice.
        public explorer:explorer,
        //
        //The node that is the parent of this one. N.B.: The root node's parent 
        //is undefined 
        public parent?: node,
        //
        //The anchor details that show where this node will be placed relative
        //to some reference when it is created. It may be undefined. When this 
        //is the case, it will be appended as a child of the parent node. If a 
        //parent is undefined, then the node cannnot be anchored and any to 
        //anchoring specification is an indicator of some logical error.
        public anchor?:anchor
    ) {
        //
        //Initialize the view (that enables a node to create elements)
        super(); 
        //
        //Create a tree view for this node unconditionally. (A list view is 
        //created conditionally
        this.tree = new tree_view(this);
        //
        //Add a list view if necessary; it is if the parent is defined and has
        //a list view
        if (parent!==undefined && parent.list_table!==undefined) this.list= new list_view(this, parent.list_table);  
        //
        //Register this node in the explorer by adding it as a node indexed by
        //its id
        this.id = explorer.register(this);
        
    }
    
    //Returns the elements of a tree view
    get_tree_view_elements():{
        root:HTMLElement, 
        selector:HTMLElement, 
        header:HTMLElement, 
        expander?:HTMLElement, 
        children:HTMLElement,
        hook:HTMLElement
    }{
        //
        //Get the parent node of the tree view. It is either the explore's tree panel, if this 
        //this is a root node, or the children element of this node's parent
        const hook:HTMLElement = (this.parent===undefined) ? this.explorer.panel.tree!: this.parent.tree.children;
        //
        //Use the div tag to create the root element without any anchoring. It is a div 
        //that serves no more purpose than containership and relative placement.
        const root = this.explorer.create_element('div', hook, {className:'root'});
        //
        //Create the element to contain header components, such as the expander, icon, node name, etc
        const header = this.explorer.create_element("div", root, {className:'header'});
            //
            //If this node is a branch add the expander button to the header. When clicked
            //on, it eithe opens or closes the children of the branch. In its initially 
            //closed because the children are not available yet. By clicking on the plus (+) the
            //children will be populated
            let expander:HTMLElement|undefined=undefined; 
            //
            if (this.content.is_branch())
             expander = this.explorer.create_element("button", header, {
                onclick:()=>this.tree.toggle(),
                //
                //Start with the button in the uninitialized mode  
                textContent:"?"
            });
            //
            //Create the element that indicates the node's selection when clicked on. It 
            //should carry teh node id as well as the branch classification because its the
            //one that supports communication with user
            const selector = this.create_tree_selection_element(header);
        //
        //Create the children element anchored to the root element. By defaut 
        //it is hidden
        const children = this.explorer.create_element("div", root,{
            className:"children",
            hidden:true
        });

        //Compile and return all the tree elements
        return {root, selector, header, expander, children, hook};

    }
    
    //Create the element that indicates this node's selection when clicked on. It 
    //should carry the node id as well as the branch classification because its the
    //one that supports communication with user. It follows the following html
    //snipet:-
    /*
        <div id=$node.id class=branch|leaf onclick="node.select()>
            <checkbox><img src=$icon/><span>$node.name</span>$properties
        </div>
    */
    //The anchor of a leaf is tha same as that of the node. That of a branch is the 
    //the header
    create_tree_selection_element(anchor:HTMLElement):HTMLElement{
        //
        //Create a div element, selector, anchored to the given one
        const selector = this.create_element("div", anchor, {
            //
            //The general identifier
            className:'selector',
            //
            //When a selector element is clicked on:-
            //-it becomes the only one marked as selected
            //-(for a branch) the children are created, if necessary
            //-the list view is painted 
            onclick:()=>{ this.tree.select();},
            //
            //When a selector is double clicked on in the tree view, it is both 
            //selected and opended
            ondblclick:()=>{this.tree.select(); this.tree.open();},
            //
            //CRUD this node, from a tree view
            oncontextmenu: async ()=>await this.crud(),
            //
            //On hovering this node in the tree view, mark it as hovered on
            onmouseover:()=>this.tree.selector.classList.add('hovered'),
            onmouseout:()=> this.tree.selector.classList.remove('hovered'),
            //
            //The identifier is key to retrieving this node from an indexed collection
            id:this.id
        });
        //Add (to the selector) the  multi-choice checkbox, if it is required
        if (this.explorer.is_multiple_choice){
            //
            //Create a check box; teh user sets its sttais for whatever (temporary) 
            //reason
            this.create_element("input", selector, { 
                type:'checkbox',
            });
            //
        }
        //    
        //Add (to the selector) the icon as an image that matches the node
        this.create_element("img", selector, { src: this.content.get_icon()});
        //
        //Add ((to the selector) the node's friendly name
        this.create_element("span", selector, {textContent: this.content.name});
        //
        //Add the attributes, depending on the user requirements
        //
        //Get the properties to be shown in the tree view. (They may be differnt
        //from those of a list view)
        const attributes = this.content.get_tree_view_attributes();
        //
        //Add them to the tree selector. Note that we are in a static method
        this.content.add_tree_attributes(this, attributes, selector);
        //
        //Return the selection element
        return selector;
    }
   
    //Use the selection to decide if the children should be painted or not
    async open(selection:Array<string>|undefined):Promise<void>{
        //
        //End the painting if there is no selection
        if (selection===undefined) return;
        //
        //Determine if we need to open his node or not
        //
        //Get the head selection item
        const head = selection[0];
        //
        //The head must have something
        if (head ===undefined) return;
        //
        //Continue only if this head item matches the content
        if (this.content.name!==head) return;
        //
        //Compose a new selection without the head, i.e., using the tail list.
        const next_selection = selection.slice(1);
        //
        //Open the node to reveal its children in the tree view.
        await this.tree.open(next_selection);
        //
        //If there is no next selection, then select the current node
        if (next_selection.length === 0) await this.tree.select();
    }

    
    //Create and display the children nodes of this one in the logical model. 
    //The return value is not critical, as it were. It is deliberately put here to 
    //remind us that we should await for this synchronous process to complete, 
    //wherever this method is called.
    public async create_children(selection?:selection):Promise<Array<node>>{
        //
        //Get the children contents of this node
        const contents:Array<common.content> = await this.content.get_children_content();
        //
        //Go through each child content and convert it to a node
        const children = contents.map(content=> {
            const Node = new node(
                //
                //The content of the child 
                content,
                //
                //The explorer allows this node to access our library functionality
                this.explorer,
                //
                //This branch becomes the parent of her children
                this
            );
            //
            //Use the given selection to open this node
            Node.open(selection);
            //
            //Return the node
            return Node;
        });
        //
        return children;
    }
    
    //This method provides a user-interface for:- 
    // - creating a new one node a child or sibbling of this one
    // - updating the property values of this node
    // - deleting this node from the entire data management system.
    public async crud():Promise<void>{
        //
        //Compile the crud operational choices 
        const choices:Array<outlook.option<crud_operation>> = [
            {value:'insert_before', name:'Insert Sibling Before'},
            {value:'insert_after', name:'Insert Sibling After'},
            {value:'append_child', name:'Append Child'},
            {value:'update', name:'Update Node'},
            {value:'delete', name:'Delete Node'}
        ];
        //
        //Get the general html file
        const general_html = app.app.current.config.general;
        //
        //Create a popup for selecting the crud operation
        const popup = new outlook.choices(
            //
            //Use the general html template in outlook
            general_html,
            //
            //Display the crud choices
            choices, 
            //
            //Use radio buttons for single selections 
            'single',
            //
            //Name  these choices as 'operation'
            'operations'
             
        );
        //
        //Get the CRUD operation
        const operation = await popup.administer();
        //
        //Discard the operation if we aborted the administration
        if (operation ===undefined) return;
        //
        //Perform the requested operation to get a result. The result is either
        //ok or an error message.
        let result:lib.crud_result|undefined = undefined;
        //
        //Remember that choice administration returns a single or an
        //array of values -- depending the the choices type
        switch(operation){
            //
            //These operation may require talking to the  server, so they are asynchronous
            case 'insert_before': result =  await this.create('insert_before'); break;
            case 'insert_after': result =  await this.create('insert_after'); break;
            case 'append_child': result =  await this.create('append_child'); break;
            case 'update': result = await this.update(); break;
            case 'delete': result = await this.delete(); break;
        }   
        //
        //Report the error if the execution failed
        if (result instanceof schema.mutall_error){
            alert(result.message);
        }
    }

    //Create, review and update a new node. We should be able to call
    //this method on a node, without having to go through the crud() user
    //interface. So, it is public
    public async create(operation:insert_operation):Promise<lib.crud_result>{
        //
        //1. Create new (empty) content (using this node's content). NB. If you want
        //to create content without reference to a node, you can use the initial content
        //used to create the explorer, e.g., this.explorer.content.create_null_content() 
        const content = this.content.create_null_content();
        //
        //The placement of the new node will be made relative to this one
        const anchor = {placement:operation, reference:this};
        //
        //Use the null content to create the new node. The parent of this new
        //node is this one. The node will be immediately visible in the tree 
        //view. It will show in the list view when this node is selected
        new node(content, this.explorer, this, anchor);
        //
        return 'ok';
    }

    //
    //Use this node's content to update the node name in the tree view
    private update_tree_view():void{
        //
        //Get the node name
        const name = this.content.name;
        //
        //Get the span tag in the selector element of the tree view
        const span = this.tree.root!.querySelector('span');
        //
        //It must exist
        if (span===null) 
            throw new schema.mutall_error(`No span tag found in selector tag`);
        //
        //Update the contents of ths span tag
        span.textContent = name;     
    }
        
    
    //Let the user supply input values to update this node and save the results.
    async update():Promise<lib.crud_result>{
        //
        //The updating takes place only in the list view, we assume this process 
        //was initiated when this node is in the list view. Conditune only if
        //this assumption is valid. It is if the list view of the node is defined
        if (this.list === undefined) 
            throw new schema.mutall_error('The selected node must already be vsible in the list view');
        //
        //Get the tr associated with this node; it's the selector element of the 
        //list view
        const tr = this.list.selector;
        //
        //Remove/hide the nomal mode for the tr
        tr.classList.remove('normal');
        //
        //Put the tr in edit mode, so that the user can capture inputs
        tr.classList.add('edit');
        //
        //A. Display the go and cancel buttons and attach the appropriate  listeners
        //
        //Get the buttons
        const go = this.explorer.get_element('go');
        const cancel = this.explorer.get_element('cancel');
        //
        //Unhide the buttons
        go.hidden = false; cancel.hidden=false;
        //
        //Wait for the user to initiate saving of the result or to abort the update
        const save:lib.crud_result = await new Promise(resolve=>{
            //
            //Clicking on the go button initiates a save operation
            go.onclick = async ()=>{
                //
                //Save the content or undo the button creation
                //
                const result = await this.content.save(tr);
                //
                //Leave the dit mode if the result it ok, otherwise stay there
                if (result==='ok') resolve('ok');
            }    
            //
            //Clicking on the cancel button initiates abortion
            cancel.onclick=()=>{
                //
                //Restore the node's tree view. The list view must be set
                if (this.list===undefined) throw new schema.mutall_error(`The list view for node '${this.id}' is not set`); 
                this.list.restore(); 
                //
                //Compile the abortion result
                const result = new Error('Update operation aborted');
                //
                //Leave the edit mode with the result
                resolve(result);
            }    
        });
        //
        //Switch of both buttons and put back tr in normal mode
        go.hidden = true; cancel.hidden=true;
        tr.classList.remove('edit');
        tr.classList.add('normal');
        //
        //Return the result of the save operation
        return save;
    } 

    //Delete this node from the content, tree and list views. We should be
    //able to execute this function programatically, i.e., without having to
    //goto through the crud() procedure. So, it is public
    public async delete():Promise<lib.crud_result>{
        //
        //1. Delete the content of this node from the physical "database"
        const result:lib.crud_result = await this.content.delete();
        //
        //Abort the operation if deletion failed
        if  (result instanceof schema.mutall_error) return result;
        //
        //Remove the node from memory
        this.undo();
        //
        //Success!
        return 'ok';
    }
   
    //Remove the node from memory
    private undo():void{
        //
        //1. Delete this node from the logical model 
        //
        //Get the parent of this node. If it is not defined, then this must be the
        //root node. It cannot be removed, otherwise the explorer becomes unusable. 
        if (this.parent===undefined) 
            throw new schema.mutall_error(`The root node ${this.id} cannot be removed`);
        //
        //If the children of this node are not defined, then something is fishy 
        if (this.parent.children===undefined) 
            throw new schema.mutall_error(`This node ${this.parent.id} has no children!`);
        //
        //Get the index of this node, from its parent's children
        const index = this.parent.children.indexOf(this);
        //
        //Remove one element at the index
        if (index > -1) this.parent.children.splice(index, 1);
        //
        //2. Delete this node from the nodes collection.
        if (!this.explorer.nodes_by_id.delete(this.id))
            throw new schema.mutall_error(`Node id ${this.id} failed to delete`);
        //
        //3. Remove this node from the tree view. 
        this.tree.delete();
        //
        //4. Remove from the list view
        this.list!.delete();
    }
    
}


//Explorer is a general purpose page that uses tree and list views to manage, 
//i.e., Create, Review, Update and Delete (CRUD) hierarchical content. It is 
//designed{-
//a) - to work with large amounts of data, so that branches for children 
//  nodes are not available until required by the user.  
//b) - to return some selected content if the user so desires; otherwise it is 
//undefined
export class explorer extends outlook.baby<common.content|undefined>{
    //
    //The root node
    public root?:node;
    //
    //The Explorer page comprises of 2 panels that are set when this explorer is painted
    public panel:{
        //
        //The tree panel is marked by a any element to which we can hook a tree structure 
        //that helps users to navigate the hierarchies of some content
        tree?:HTMLElement,
        //
        //The list view panel is any element where we can hook a table that can display
        //display the properties of this node's children in a tabular fashion
        list?:HTMLElement
    } = {tree:undefined, list:undefined}
    //
    //Collection of nodes indexed with an autogerenated id that is used for 
    //linking nodes to the tree or list views
    public nodes_by_id:Map<path, node> = new Map();
    //
    //The currently available id for labeling nodes uniquely. The number is 
    //auto-incremented whenever a new node is registered in the collection
    public available_id:number=0; 
    //
     constructor(
        //
        //The content that needs to be tree managed. 
        public content:common.content,
        //
        //The mother of this baby page (as required by the ancestor)
        mother:outlook.page,
        //
        //The list of nodes (identified by tagnames) to guide the selection. The
        //default is none, leading to the the initial tree view coming collapsed
        public selection:Array<string>=[],
        //
        //Indicates if exploer was called to select a node, i.e., branch or leaf,
        //or not. If true, the check method ensures that there is a selection 
        //before closing the baby quiz page. The default is that explorer is 
        //called for browsing the tree only; 
        public is_select:boolean=false,
        //
        //Indicates if the expected selection is a leaf or a branch. The default 
        //is a branch. Note that this option is sensible only if is_select is true.
        public is_branch:boolean = true,
        //
        //Indicates if the explorer can be used for selection multiple choices 
        //or not. The default is not. The vaue returned from administration
        //depends  on this setting
        public is_multiple_choice:boolean = false
    ){
        //
        //The explorer template is part of teh shared files
        super(mother,  "/schema/v/code/explorer.html");
    }
    
    
    //
    //Create and paint the tree view in this explorer's panel. The painting also
    //expands the tree to match the current selection, so that the selected part 
    //of the tree view is apropriately expanded.
    async show_panels(){
        //
        //Get/set the tree panel element from the explorer template
        this.panel.tree = this.get_element("tree");
        //
        //Get/set the list panel element from the explorer template
        this.panel.list = this.get_element("list");
        //
        //Use this explorer's content to create the root node. Note: it has no 
        //parent, the anchorage is undefined and it should be immediately 
        //visible from the tree view
        this.root = new node(this.content, this);
        //
        //Open the root node with the current selection, to display the initial 
        //tree. If there is no initial selection, assume that the root is selected
        const selection = this.selection.length === 0 
            ? [this.root.content.name] /*the tagname*/
            : this.selection; 
        await this.root.open(selection); 
    }
    
    //
    //Register the requested node by adding it to the collection of nodes indexed by
    //an automaically generated id. The id is used for linking the logical model
    //to the view in MVC parlance.
    register(node:node):string {
        //
        //Get the current available id number
        const num:number = this.available_id;
        //
        //Prepare teh next available id
        this.available_id++;
        //
        //Formulate the id to a string that is suitable as an idenfier
        const id = `i${num}`;
        //
        //Index the node by its id to prepare for the frequent retrievals
        this.nodes_by_id.set(id, node);
        //
        //Return the id.
        return id;
    }
   
    
    //Check the explorer page before ok is pressed. 
    //The beviour of this method depends on 2 constructor arguments:is_select 
    //and is_file. See explorer constructor for details.
    async check():Promise<boolean>{
        //
        //If we are not doing a selection, then further action is not necessary
        if (!this.is_select) return true;
        //
        //Check if there is the requested (file or branch) selection in the 
        //list view. If there is, then set the quiz result and leave the page
        if (this.selection_exists('list')) return true;
        //
        //Check if there is the requested (file or branch) selection in the 
        //tree view. If there is, then  set the quiz result and leave the 
        //page; otherwise leave the page open
        return (this.selection_exists('tree'));
    }

    //Returns the result of selection a node. This was set during the check 
    //method -- if at all
    async get_result(){
        //
        return this.result;    
    }

    //From the given anchor element, remove  all the current marked elements; 
    //then mark the target element. By default, the marking is 'selected', but 
    //the user can override this, e.g., hovered.
    select(anchor:HTMLElement, target:HTMLElement, mark:string='selected'){
        //
        //Get all the marked element that are descendants of the anchor. 
        //Remember to add the leading dot (.)
        const selections = anchor.querySelectorAll(`.${mark}`);
        //
        //Remove all the marked elements
        Array.from(selections).forEach(selection=>selection.classList.remove(mark));
        //
        //Mark the given target
        target.classList.add(mark);
    }

    //Check if there is a selection in the tree or branch panels -- depending
    //on the request (i.e., file or branch). If there is, then set the quiz 
    //result and return true; otherwise it is false
    selection_exists(request:'list'|'tree'):boolean{
        //
        //Get the selection from the requested panel. 
        const selection = this.panel[request]!.querySelector(".selected");
        //
        //If there is a selection, in requested panel set the explores result to
        //the node'sselection;  there is no need for further tests
        if (selection!==null){
            //
            //Set the explorer's  result property, to be returned when administration is over
            //
            //Use the selection element's id to retrieve the indexed node
            const node = this.nodes_by_id.get(selection.id);
            //
            //It is an error if the node is not found. Use the id to identify the node
            if (node ===undefined) 
                throw new schema.mutall_error(`Node '${selection.id}' not found in the nodes collection`);
            //
            //Set the result
            this.result = node.content;
            //
            //Exit from this baby page succesfully
            return true;
        }
        //Otherwise return false
        return false;
        
    }
    
 
}
//
//The namespace that is shared by all technologies
export namespace common{

    //Modelling the content to be managed using explorer. This is the home
    //for all methods that derived classes should implement 
    export abstract class content{
        //
        constructor(
            //
            //The name used as a tag in a tree view
            public name:string, 
            //
            //The properties of this content
            public properties:properties,
            //
            //The parent of this node. Root nodes have no parent
            public parent?:content

        ){}

        //Every node is assumed to be a branch, unless the user decides the 
        //contrary.
        is_branch():boolean{return true; };

        
        //Select this contenty. By default, this does nothing. In teh case of a
        //service.solution we execute a listener
        select(view:tree_view):void {}

        //Returns the contents of the children of of a branch content. For instance: the
        //content of /tracker/v/code are all the files and folders that are children subfolders
        //of this path, e.g., /tracker/v/code/main.ts
        abstract get_children_content():Promise<Array<content>>;

        //Returns the source of the icon that represents a branch and leaf images. The user can 
        //override the methods to define content-relevant images
        get_icon():path{
            return this.is_branch() 
                ? "/schema/v/code/folder.ico"
                : "/schema/v/code/file.ico";   
        }

        //Returns the header column names of this node to be displayed in a list 
        //view.  
        abstract get_header_names():Array<string>;
        
        //Delete this content from the storage system return a crud result, indicating
        //success or failure
        abstract delete():Promise<lib.crud_result>;
        
        //Create an io based on the content of this node, its property name, and the
        //current cell. The io is automatically saved in an indexed collection 
        //for further use.
        abstract create_io(cname:string, anchor:io.anchor):io.io;
        
        //Create new (empty/null) content (using this node's content). NB. If you want
        //to create content without reference to a node, you can use the initial content
        //used to create the exlorer, e.g., this.explorer.content.create_null_content() 
        abstract create_null_content():content;
            
        //By comparing the original and the values in the tr, write changes to the storage 
        //system
        abstract save(tr:HTMLTableRowElement):Promise<lib.crud_result>;
        //
        //Rteurns the properties that should be displayed in the tree view
        abstract get_tree_view_attributes():properties;
        
        //Add attributes to the tree view, anchored at the given selector element
        add_tree_attributes(node:node, properties:properties, selector:HTMLElement):void{
            //
            //Use the node to create and anchor the options element.
            const options = node.create_element('div', selector, {className:'options'});
            //
            //Loop through all the properties and attach each one of them as an option
            //of the options tag
            for(const key in properties){
                //
                //Get the key's value
                const value = properties[key];
                //
                //Create the option element as a child of options
                const option = node.create_element('div', options, {className:'option'});
                //
                //Add the key span element
                node.create_element('span', option, {className:'key', textContent:key});
                //
                //Add the key/value separator span tag
                node.create_element('span', option, {className:'sep', textContent:':'});
                //
                //Convert the value to a string
                let str = String(value);
                //
                //Truncate the string to 15 characters if necessary
                const max:number = 15
                str = str.length > max ? str.substring(0, max-1) + '…' : str;
                //
                //Add the value span tag. 
                node.create_element('span', option, {className:'value', textContent:str});
            };
        }
    }
}

//The namespace for xml technology
export namespace xml{

    
    //Xml data is a natural candidate for tree viewing.
    abstract class content extends common.content{
        //
        constructor(
            public element:Element,
            properties:properties,
            parent?:content
        ){
            //
            //Iniialize the common contemt element
            super(element.tagName, properties, parent);
        }
        
        //Returns the children of an element as an array of xml content.
        async get_children_content():Promise<Array<child>>{
            return Array.from(this.element.children).map(element=>new child(element, this));
        }
        
        //Returns the io to be associated with an xml content. For now, every xml 
        //content is to be associated with with an exprt text field 
        create_io(cname:string, anchor:io.anchor):io.io{
            return new io.input("text", anchor);
        }

        //A null xml content uses the owner document of this conteent to create
        //a new element with no name 
        create_null_content():child {
            //
            return new child(this.element.ownerDocument.createElement('noname'), this);
        }

        //Deleting this xml content removes its element from dom
        async delete(): Promise<lib.crud_result> {
            //
            //Detach this content;s element from DOM
            this.element.remove();
            //
            return 'ok';
        }

        //Returns the attribute names of this element to be displayed in a list
        //view
        get_header_names():Array<string>{
            //
            //Collect all the attribute names of the children of the underlying
            //element
            const dirty_names:Array<string> = Array.from(this.collect_attribute_names())
            //
            //Clean the names
            const names = [...new Set(dirty_names)];
            //
            //Return the cleaned attributes
            return names; 
        }
        //
        //
        //Collect all the aattribute names of this cncontent
        private *collect_attribute_names():Generator<string>{
            //
            //Loop through all the children of the underlying element to collect 
            //the attributes
            for(const child of Array.from(this.element.children)){
                //
                //Loop through all the attributes of the child to collect the
                //names
                for (let i=0; i<child.attributes.length; i++){
                    
                    //Yield the attribute
                    yield child.attributes[i].name;
                }
            }
        }

        //Return the properties of this xml content. This data is used for driving the 
        //list view of an explorer. 
        static get_properties(element:Element):properties{
            //
            //Start with an emyty list of key/value pairs
            const props:properties = {};
            //
            //Loop through all the attributes of this contents element and
            //collect them as key value pairs
            //namee
            for (let i=0; i<element.attributes.length; i++){
                //
                //Get the key
                const key = element.attributes[i].name;
                //
                //get the value
                const value = element.attributes[i].value;
                //
                //Yield the attribute
                props[key]=value;
            }
            //
            //Return the pairs
            return props;
        }

        //By comparing the original and the values in the tr, write changes to the storage 
        //system
        async save(tr:HTMLTableRowElement):Promise<lib.crud_result>{
            //
            //Loop through all the cells in the td, updating matching attribute in the 
            //underlying element if necessary
            for(const td of Array.from(tr.cells)){
                //
                //Get the io that matches the td
                const Io = io.io.get_io(td);
                //
                //Get the column name
                const cname = td.dataset.cname;
                if (cname===undefined)
                    throw new schema.mutall_error(`This td has no column name`);
                //
                //Get the value to save
                const value_new:lib.basic_value = Io.value;
                //
                //Get the original value
                const value_old:string|null = this.element.getAttribute(cname);
                //
                //Update the named property if necessary
                if (this.value_has_changed(value_old, value_new)) {
                    //
                    //Change the new value to a string
                    const value:string = (value_new===null) ? '': String(value_new);
                    //
                    this.element.setAttribute(cname, value);
                }
            }
            //
            //Indicate success
            return 'ok';
        }

        //Returns true if the old value is different from the new one
        private value_has_changed(old_value:string|null, new_value:lib.basic_value):boolean{
            //
            //Compare the values as strings; there is no change whenthe 2 are equal
            if (old_value === String(new_value)) return false;
            //
            //Compare null and empty values, when there is no change
            if (old_value==='' && new_value===null) return false;
            //
            //The default is that the value has changed
            return true;
        }
       
        //All the properties of an exml contenmt are shown in the tree view
        //as atttributes
        get_tree_view_attributes(): properties {
            return this.properties
        }
    
    }

    //The root of an xml document
    export class root extends content{
        //
        constructor(xml_str:string){
            //
            //Get the xml dom document, that represents the data (MODEL) to be 
            //explored
            
            //Parse the input data, assumimg to be an xml string
            const parser = new DOMParser();
            //
            //Parse the input xml data
            const doc = parser.parseFromString(xml_str,  "application/xml");
            //
            //Test if the parsing was succesful or not. If not successful, the 
            //document will contain a parsererror node. Hopefully the text content
            //of the node has the error message
            const error_node = doc.querySelector('parsererror');
            //
            //If parsing failed discontinue the show.
            if (error_node)
                throw new schema.mutall_error(`xml Parsing failed:${error_node.textContent}`);
            //
            //The document must have a root element, unless something went wrong
            if (doc.documentElement === null) throw new schema.mutall_error('Null xml is not expected');
            //
            //The root element has no properties and no parent
            super(doc.documentElement, {}, undefined);
        }

    }

    class child extends content{

        //Re-decalare  the parent property so that it is mucch richer than that of
        //common.contemt
        declare parent:content;

        constructor(

            element:Element,
            //
            parent:content
        ){
            //
            //Statically, get the properties of the given element
            const properties = content.get_properties(element);
            //
            //Inialize the common contemt element
            super(element, properties, parent);
        }
    }

//
//End of the xml namepace
}

//The namespace for file system Technology
export namespace directory{

    //An Operating System directory (comprising of files and folders) is content 
    //that is fit for tree viewing. The fully specified path of slash seperated 
    //strings is used to represent a selection, i.e., file or folder
    abstract class content extends common.content{
        //
        //Directory data is presented in two paths. The root directory and the path
        //of the data relative to the root, so that the full path is that of the root
        //plus the relative one. In addition we need information whether this path
        //represents a file or folder
        constructor(
            //
            //The base name of this path
            public name:string,
            //
            //The properties of the path
            public properties:properties,
            //
            //The full path name of the current directory entry 
            public path:path,
            
            //
            //Tells us if the path is a file or folder
            public is_file:boolean,
            //
            parent?:content

        ){
            //Get the name to use for the directory
            //
            super(name, properties, parent);
        }

        //Returns the files and/or folders (as directory contemts) that are children 
        //of this folder through scanning. 
        async get_children_content():Promise<Array<content>>{
            //
            //Scan the current directory for file and folder entries. The reurned name
            //is the path of child entry, relative to the root 
            const scans: Array<{path:path, name:string, is_file:boolean, properties:{[index:string]:lib.basic_value}}> = await server.exec(
                //
                //The class that supports management of directories on the server
                "path",
                //
                //The file manager takes the 2 paremeters that define the current path:
                //The root and relative paths
                [this.path, this.is_file],
                //
                //The directory operation that is required
                "scandir",
                //
                //Scanning a directory has ho aruments
                [] 
            );
            //
            //Convert the raw scan to directories and return them
            return scans.map(scan=>{
                //
                //Destructure the scan
                const {path, name, is_file, properties} = scan;
                //
                //Create a directory entry. 
                return new child(path, name, properties, is_file, this);
            });
        }

        
        //There are 4 header names associated with a direcrory 
        get_header_names(): Array<string> {
            return [
                //
                //Name of the folder or file. For files, it is filenam and extension. For
                //folders, its just the base name
                "name",
                //
                //The size of the folder or file in bytes
                "size",
                //
                //The creation date
                "create_date",
                //
                //The date of the last modification
                "modify_date"
            ]
        }

        //Only the a name file (in a directory namespace) is a modifiable text;
        //the rest of the properties are read-only
        create_io(cname: string, anchor:io.anchor): io.io {
            //
            return cname==='name' ? new io.input("text", anchor): new io.readonly(anchor);
        }


        //Returns true current path is a folder, i.e., not a file
        is_branch(): boolean {
            return !this.is_file;
        } 

        //Use this directory to create a new one
        create_null_content(): content {
            //
            //Let the name of the file/folder to be created be tmp
            const name = "tmp";
            //
            //Determine if we want to create a file or folder. For this version, only
            //folders can be created
            const is_file = false;
            //
            //Create a temporary file (in the root), whose name is tmp 
            //
            //The new directory shares the same root as this one. The root has no properties
            return new child(this.path, name, {}, is_file, this)
        }
    
        //No property of path is shown in the tree view as atttributes
        get_tree_view_attributes(): properties {
            return {};
        }
    
    }

    //The special root node of a directory
    export class root extends content{
        //
        constructor(
            //
            //The root path, beyond which browsing is not allowed. It correponds 
            //to the relative path of the child node
            public root:path,
            //
            //Tells us if the path is a file or folder
            is_file:boolean
        ){
            //Let thh name of the root path be a slash (/) and it has no 
            //properties
            super('/', {}, root, is_file);
        }


        //Delete the current folder or file from the server
        async delete(): Promise<lib.crud_result> {
            throw new schema.mutall_error('The root node cannot be deleted');
        }

        //Rename the current file, if it exists, or cteate a new one
        async save(tr: HTMLTableRowElement): Promise<lib.crud_result> {
            throw new schema.mutall_error('The root node cannot be edited, so cannot be saved');
        }

    }

    //Content that has a parent
    export class child extends content{
        //
        //Redefine parent so that it is visible as content from the directory namespace
        declare parent?:content;

        constructor(
            //
            //The path of the current directory entry, relative to the root 
            path:path,
            //
            //The base name of the path. (This could be obtained from the relative
            //path but 3rd party libraries are required to manipulate a path -- and
            //Im not familiar with them  
            name:string,
            //
            //The properties of a child content
            properties:properties,
            //
            //Tells us if the path is a file or folder
            is_file:boolean,
            //
            parent?:content,
            
        ){
            super(name, properties, path, is_file, parent);
        }

        //Returns the node name of this path
        get_name(): string {
            return this.name;
        }

        
        //Delete the current folder or file from the server
        async delete(): Promise<lib.crud_result> {
            //
            //Execute delete on the server and return the result
            await server.exec(
                //
                //The class that supports management of directories on the server
                "path",
                //
                //The file manager takes the 2 parameters that define the current path:
                //The root and relative paths
                [this.path, this.is_file],
                //
                //The directory operation that is required
                "delete",
                //
                //No nore data is required to specify a delete
                [] 
            );
            //
            //Rteurn ok if deleting was successful
            return 'ok';
        }
        
        //Rename the current file, if it exists, or cteate a new one
        async save(tr: HTMLTableRowElement): Promise<lib.crud_result> {
            //
            //Only theh file/folder name property needs to be considered
            //Get it from the tr
            const td = tr.querySelector('td[data-name]');
            if (!(td instanceof HTMLTableCellElement)) throw new schema.mutall_error('No td with found with data-name attribute');
            //
            //The name property must be present
            const value = io.io.get_io(td);
            //
            if (typeof(value) !=='string') throw new schema.mutall_error('File/Folder name not found');
            //
            //Compare it with the past and return ok if not different
            if (value === this.name) return 'ok';
            //
            //Rename the current file or folder to the given value
            await server.exec(
                'path',
                [this.path, this.is_file],
                'rename',
                //
                //Rename the current file to this one
                [value]
            );
            //
            //Return ok if successful
            return 'ok';

        }

    }

}

//Managing hierarchial records from a database table that contains a child_of 
//column
export namespace record {
    
    //This class is used for managing content (of data records obtained from a self looping
    //table) in a hierachical fashion. A selection can be represented by the primary
    //key of a desired record
    class content extends common.content{
        //
        //Define the frequent reference of a dbname/ename in sql, e.g., `user`.`mame`
        get ename(){ 
            const q="`";
            return `${q}${this.subject.dbname}${q}.${q}${this.subject.ename}${q}`;
        }
        //
        //The datatabase that matches the subject dbname
        public dbase?:schema.database;
        //
        //The metadata resulting from a record description 
        //The original sql used for formulating the query for isolating this record's children
        sql?:string; 
        //
        //The column names
        col_names?:Array<string>;
        //
        //The maximum number of children for this record 
        max_records?:number;
        //
        //Redefine parent so that it is visible as content from the the record namespace
        declare parent?:content;

        constructor(
            //
            //The database and entity name from where this record is stored
            public subject:subject,
            //
            //The tag or node name to be associated with this record
            name:string,
            //
            //The record properties, Ifuel
            properties:properties,
            //
            //The field name to use as the source of the tag names for this
            //node's children. If undefined is the friendly  component of the 
            //primary key
            public fname?:string,
            //
            //the parent content
            parent?:content
            
        ){
            super(name, properties, parent);
        }
        
        //Use the editor query to return the  children of a primary key as all those 
        //records whose child_of field points to the key.
        async get_children_content():Promise<Array<child>>{
            //
            //Get the editor description.
            const metadata = await server.exec(
                //
                //The editor class is an sql object that was originaly designed 
                //to return rich content for driving the crud page.
                "editor",
                //
                //Constructor args of an editor class are ename and dbname 
                //packed into a subject array in that order.
                [this.subject.ename, this.subject.dbname],
                //
                //The method called to retrieve editor metadata on the editor class.
                "describe",
                //
                //There are no describe method parameters
                []
            );
            //
            //Destructure the metadata
            const [idbase, col_names, sql_original, max_record] = metadata;
            //
            //Set the metadata properties
            this.dbase = new schema.database(idbase);
            this.sql = sql_original; 
            this.col_names = col_names; 
            this.max_records = parseInt(max_record);
            //
            //Formulate the child selection condition. Notice how the null
            //condition is formulated. Json extract function has a problem!
            const condition = this instanceof child ? `= ${this.pk}` : "='null'"; 
            //
            //Formulate the (local) sql for selecting children of the primary key 
            const local_sql = `select entry.* from (${sql_original}) as entry where entry.child_of->>"$[0]" ${condition}`;
            //
            //Execute the sql to get Ifuel,
            const ifuel = await server.exec(
                //
                //Use the database class to query
                "database",
                //
                //Get the dbname, as the only database constructor argument
                [this.subject.dbname],
                //
                //The method to execute
                "get_sql_data",
                //
                //The sql argument of the method
                [local_sql]
            );
            //
            //Convert Ifuel to children
            return ifuel.map(fuel=>new child(this.subject, fuel, this.fname, this));       
        }

        //A record is a branch if it has children and there is no evidence 
        //to suggest otherwise
        is_branch(): boolean {
            
            // The default behaviour should be
            //that of a branch, unless teh evidence suggests otherwise
            //
            //An empty node is one pice of evidence of a leaf
            const empty = (this.max_records===0);
            
            /*
            //There is some evidence that this is a leaf. There is if...
            const is_leaf =  
                //
                //The column names are known...
                this.col_names!==undefined
                // 
                //...and they include a field named leaf
                && this.col_names.includes('leaf')
            //
            return !(empty && is_leaf);
            */
            return !empty;
        }  
        
        //Create an io based on the content of this node, its column name, and 
        //the given anchor
        create_io(cname:string, anchor:io.anchor):io.io{
            //
            //Get the named column from the underlying database. 
            //Use the parent content as it is the one whose dbase is ready by now. 
            //It must be defined
            if (this.parent===undefined) throw new schema.mutall_error('Cannot create an io for a root content');
            //
            const col  = this.parent.dbase!.entities[this.subject.ename].columns[cname];
            //
            //Get and return the matching io using te io library
            return io.io.create_io(anchor, col);
        }

        //Create new (empty/null) record (using this node's record). NB. If you want
        //to create content without reference to a node, you can use the initial content
        //used to create the explorer, e.g., this.explorer.content.create_null_content() 
        create_null_content():child{
            //
            //Define the shape of record's empty content
            let fuel:{[index:string]:lib.basic_value}={};
            //
            //Use the header names of this content to build an empty structure
            for(const name of  this.get_header_names()){
                fuel[name]=null;
            }
            //
            //Create a new record, using  the null content and based on the same subject 
            //as this one. There is no current selection
            return new child(this.subject, fuel, this.fname)
        }
        
        //The root node cannot be deleted
        async delete():Promise<lib.crud_result>{
            throw new schema.mutall_error('Root node cannot be edited, so it cannot be deleted');
        }

        async save(tr:HTMLTableRowElement):Promise<lib.crud_result>{
            throw new schema.mutall_error('Root node cannot be edited, so it cannot be saved');
        }

        //Returns the header column names of this node to be displayed in a list view.
        get_header_names():Array<string>{
            return this.col_names!
        }
    
        //No property of record is shown in the tree view as atttributes
        get_tree_view_attributes(): properties {
            return {};
        }
    
    }

    //The root content, i.e., a record that has no parent
    export class root extends content{

        constructor(
            //
            //The database and entity name associated with the record to be  
            //explored
            subject:subject,
            //
            //The primary key value
            public pk:lib.basic_value,
            //
            //Indicates if the query is recursive or not
            public is_recursive:boolean, 
            //
            //The field name to use as the source of the tag names for this
            //node's children. If undefined is the friendly  component of the 
            //primary key
            fname?:string,
            
        ){
            //
            //The root element has a slash name and no properties
            super(subject, '/', {}, fname);
        }

        //Get the selection that matches this root cpntent's primary key. The selection
        //is an array of nodes that are used to open up a tree to display the
        //currently selected foreign key value
        async get_selection():Promise<Array<string>>{
            //
            //if there primary key is null, return an empty selection
            if (this.pk===null) return [];
            // 
            //If this foreign then not hierarchical, then the requred query is 
            //not recursive  
            //
            //Get the description of the subject
            const desc = await server.exec(
                'editor', 
                [this.subject.ename, this.subject.dbname], 
                'describe', 
                []
            );
            //
            //Get the entity name being explored:-
            const ename = this.subject.ename;
            //    
            //Workout the tag name to use for labelling the nodes: Its either the 
            //friendly component or the provided fieldname 
            const tagname:string = this.fname===undefined ? `${ename}->>$[1]`: this.fname;

            //Simplify the raw editor sql to fit out hirearchical purpose
            const editor:string  = `
                select 
                    ${ename}->>$[0] as editor
                    , ${tagname} as tagname 
                    , child_of->>$[0] as child_of 
                from (${desc[2]}) as editor`;
            //
            //Define the required sql statement. It will be either recursive or not
            let sql:string;
            //
            if (this.is_recursive){
                //
                //For recursive situations...
                //
                //Formulate the recursive query for retrieving the selection
                sql = "with "
                    //
                    //Extract the usul keys and from the raw editor 
                    +`editor as (${editor})`
                    //
                    //The recursive CTE returning the desired members
                    +`, recursive member as (`
                        //
                        //The initial result of the recusssion
                        + `select * from editor where editor =  ${this.pk} `
                        //
                        //Unite this initial result with the recursive member CTE
                        +`UNION ALL `
                        + `select editor.* from editor 
                                inner join member on member.child_of=editor.editor`
                    +`) `
                    //
                    //Formulate the final query to run
                    +`select * from members`;
            }else{
                //
                //This is not a recursive query, so the result is only one level
                sql = `select * from editor where editor =  ${this.pk}`;
            }    
            //
            //Execute it to get the results
            const rows:lib.Ifuel = await server.exec('database', [this.subject.dbname], 'get_sql_data', [sql]); 
            //
            //Massage the result to the desired array
            let selection:Array<string> = rows.map(row=>String(row.tagname)); 
            //
            //Return the result selection. It starts with the name of the current tagname
            return [this.name, ...selection]

        }


    }

    //A child content, i.e., content that has a parent 
    class child extends content{
        //
        //The primary key value of this record
        public pk:number;
        //
        constructor(
            //
            //The database and entity name from which the primary key comes from
            subject:subject,
            //
            //The content of tabular data is represented by the record's properties
            //as fname/value pairs
            public fuel:{[index:string]:lib.basic_value},
            //
            //The field to use as the tag name for the children of this node, if 
            //it is available. Otherwise use the friendly component 
            fname?:string,
            //
            //The parent content
            parent?:content
        ){
            //
            //Get the entity name
            const ename = subject.ename;
            //
            //Get the friendly primary key column, as a json array string
            const json = String(fuel[ename]);
            //
            //Convert the json string to a friendly object
            const primarykey = JSON.parse(json);
            //
            //Get the tagname of this record; use the given fiel name to rettrieve it
            const name:string = fname===undefined ? primarykey[1] : String(fuel[fname]);
            //
            //Initialize the common content. 
            super(subject, name, fuel, fname, parent);
            //
            //Set the primary key value
            this.pk = primarykey[0];
        }
        //Delete this content from the storage system to return a crud result, indicating
        //success or failure
        async delete():Promise<lib.crud_result>{
            //
            //Get the primary key of the record to delete. Its key is named the same the
            //ename of this record
            const pk = this.fuel[this.subject.ename];
            //
            //Formulate the delete sql and ensure that the entity name is 
            //enclosed with back ticks.
            const ename_str = `\`${this.subject.ename}\``;
            const sql = `delete  from ${ename_str}  where ${ename_str}=${pk}`;
            //
            //Execute the delete query on the server and return the 
            //number of affected records.
            const records = await server.exec("database", [this.subject.dbname], "query", [sql]);
            //
            //Check if the delete was successful or not.
            return records === 1 
                ?'ok' 
                :new schema.mutall_error(`The following query was not successful:${sql}`);
        }

        
    }
}

//
//Mutall services defined in terms of (static) products and solutions
//and  packaged into a tree structure
export namespace service{
    //
    //The static nature of products being explored
    export type products = Array < outlook.assets.product|outlook.assets.solution>;
    //
    export class content extends common.content{
        //
        //Create the root product node with a defined selection.
        constructor(
            //
            //The content tag name
            name:string, 
            //
            //The properties of a product
            properties:properties, 
            //
            //The static product data being explored 
            public products:products,
            //
            //Whether a product is a branch or nor
            public is_product:boolean,
            //
            //The product loistener if it is a solution
            public listener?:outlook.assets.listener,
            //
            //The parent of the content
            parent?:content
            
        ){
            super(name, properties, parent);
        }

        //The io for products is read only
        create_io(cname: string, anchor: io.anchor): io.io {
            return new io.readonly(anchor);
        }

        //A product is a branch
        is_branch(): boolean {
            return this.is_product;
        }

        //Get the children of a product.
        async get_children_content(): Promise<common.content[]> {
            //
            //Loop through the keys of products to generate product and solution 
            //contents
            const contents = this.products.map(
                product=> {
                    //
                    //Define the children of this product
                    //
                    //There are two types of childe nodes: products and solutions
                    //
                    //Prepare to track produtc and solutions separately
                    let is_product:boolean;
                    let children:products;
                    let listener: outlook.assets.listener|undefined;
                    //
                    //Test if this is aproduct or a solution.
                    if ('solutions' in product){
                        //
                        //This is a product
                        is_product = true;
                        //
                        //The children of a product are teh solutions
                        children = Object.values(product.solutions);
                    }else{
                        //
                        //This is a solution
                        is_product = false;
                        //
                        //A solution has no children
                        children = [];
                        //
                        //Set teh listener
                        listener = product.listener;
                    }
                    
                    //
                    //Create the child content
                    return new content(
                        //
                        //The product's tagname comes fom its id
                        product.id,
                        // 
                        //Title is the only property of a product
                        {title: product.title},
                        // 
                        //The children (as tree.products) of this content
                        children,
                        //
                        //A product is a branch
                        is_product,
                        //
                        //The listener
                        listener,
                        //
                        //The parent of this new product is this one
                        this
                   );
                }
            );
            
            return contents;
            
        }
        
        //By default, we cannot create content for nodes in this namespace
        create_null_content(): content {
            //
            //Get the name used of this objects's constructor
            const name = this.constructor.name; 
            //
            throw new schema.mutall_error(`Content for '${name} cannot be constructed`);
        }
        //
        //In general, content cannot be deleted
        delete(): Promise<lib.crud_result> {
            throw new schema.mutall_error(`Content for '${this.constructor.name} cannot be deleted`);
        }

        //In general, content cannot be saved
        save(tr: HTMLTableRowElement): Promise<lib.crud_result> {
            throw new schema.mutall_error(`Content for '${this.constructor.name}' cannot be saved`);
        }
        
        //Override the content select, if a listenet is found
        select(view:tree_view):void{
            //
            //If the listener...
            if (
                //...is defined
                (this.listener !== undefined) 
                //
                //...and isof teh event type
                && this.listener[0]==='event'
            ){
                //
                //...then the next element is the event listenet. Execute it.
                this.listener[1]();
            }
        }


        //By default, no property of EAR content is shown in the tree view as 
        //atttributes. The user my choose to override this behaviour on a case by
        //case basis
        get_tree_view_attributes(): properties {
            return {};
        }
        
        //There are no properties to show for service.content, so the are no
        //header names 
        get_header_names(): Array<string> {
            return [];
        }    
            
    }
}
