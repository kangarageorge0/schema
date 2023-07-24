//
//Modelling special mutall objects that are associated with a database schema.
//Database, entity, index and column extends this class. Its main characterstic
//is that it has an orgainzed error handling mechanism.
export class schema {
    //
    //The partial name is the unique identifier of this schema object it aids in 
    //logging and also in saving of this schema in an array since this name  is mostly
    //used as an index
    partial_name;
    //
    //Error logging is one of the major features of this schema with its ability to bash
    //its own error which affects the display of this schema 
    errors;
    //
    //Define a globally accessible application url for supporting the working of
    //PHP class autoloaders.
    //The url enables us to identify the starting folder for searching for 
    //PHP classes.
    static app_url;
    //
    //To create a schema we require a unique identification also called a partial 
    //name described above 
    constructor(partial_name) {
        //
        //The unique identification of this schema 
        this.partial_name = partial_name;
        //
        //A collection of the errors saved inform of an array for further buffered for 
        //latter reporting. note these are the mojor causes for a schema object to be 
        //represented using a red color 
        this.errors = [];
    }
    //
    //displays the error in this schema object in a dive that can be appended 
    //as a node where required 
    display_errors() {
        //
        //create a div where to append the errors with an id of errors 
        const div = document.createElement('div');
        div.setAttribute("id", "errors");
        //
        //add the title of this error reportin as this partial name has count no
        // of error
        const title = document.createElement('h2');
        title.textContent = `<u><b>This shema ${this.partial_name} has ${this.errors.length} not compliant 
                           with the mutall framework </u></b>`;
        div.appendChild(title);
        //
        //loop through each of the errors appending their text content to the div 
        this.errors.forEach(function (error) {
            //
            const msg = document.createElement("label");
            msg.textContent = error.message;
            div.appendChild(msg);
        });
        //
        return div;
    }
    //
    //Activates static error objects retrieved from php to js errors for further 
    //altering of the display in this this schema 
    activate_errors(static_errors) {
        //
        for (const err in static_errors) {
            const erro = new Error(err);
            //
            //offload any additional information eg the additional information
            Object.assign(erro, err);
            //
            //Add these errors to the error collection 
            this.errors.push(erro);
        }
    }
}
//
//This class extends the normal Javascript error object by 
//alerting the user before logging the same to the console.
export class mutall_error extends Error {
    //
    //Every error has an error message 
    constructor(msg) {
        //
        //Create the parent error object
        super(msg);
        //
        //Alert the user
        alert(msg);
    }
}
//Is a mutall object that models a database class. Its key feature is the 
//collection of entities.
class database extends schema {
    static_dbase;
    //
    //A collection of entites for this database modeled intoa map because with 
    //an object it was difficult to test its data type 
    entities;
    //
    //Databases are identified with the column name hence should be a unique string name
    //you may notice it is similar with the schema partial name but it homed here 
    //and its childern need it hence worth repeating 
    name;
    //
    //Construct the database from the given static database structure imported
    //from PHP
    constructor(
    //
    //The static dbase that is used to create this database it is derived from php
    //i.e the encoded version of the php database 
    static_dbase) {
        //
        //Initialize the parent so thate we can access 'this' object
        super(static_dbase.name);
        this.static_dbase = static_dbase;
        //
        //Offload all the properties in the static structure o this new database
        Object.assign(this, static_dbase);
        //
        //Activate the entities so as to initialize the map 
        this.entities = this.activate_entities();
        //
        //activate any errors if any 
        this.activate_errors(static_dbase.errors);
        //
        //initialize the name of the database 
        this.name = static_dbase.name;
    }
    //
    //Activate the static entities collection of entities  as entities in a map with 
    //string enames as the keys and the activated entity as the value returninig a map
    //which activates this entities
    activate_entities() {
        //
        //start with an empty map
        const entities = {};
        //
        //Loop through all the static entities and activate each one of them setting it in
        //the object entities indexed by thr 
        for (let ename in this.static_dbase.entities) {
            //
            let static_entity = this.static_dbase.entities[ename];
            //
            //Create the active entity, passing this database as the parent
            let active_entity = new entity(this, static_entity);
            //
            //Replace the static with the active entity
            entities[active_entity.name] = active_entity;
        }
        //
        //Return the entities of this database
        return entities;
    }
    //
    //Returns the entity if is found; otherwise it throws an exception
    get_entity(ename) {
        //
        //Get the entity from the collection of entities in the map
        //used the $entity so as not to conflict with the class entity 
        const Entity = this.entities[ename];
        //
        //Take care of the undeefined situations by throwing an exception
        //if the entity was not found
        if (Entity === undefined) {
            //
            throw new mutall_error(`Entity ${ename} is not found`);
        }
        else {
            return Entity;
        }
    }
    // 
    //Retrive the user roles from this database. 
    //A role is an entity that has a foreign key that references the 
    //user table in mutall users database.
    //The key and value properties in the returned array represent the 
    //short and long version name of the roles.
    get_roles() {
        //
        //Get the list of entities that are in this database
        const list = Object.values(this.entities);
        //
        //Select from the list only those entities that have a column called
        // name.
        const interest = list.filter(entity => {
            //
            //Get the column names of this entity
            const names = Object.keys(entity.columns);
            //
            //Check whether name is one of this names
            const exist = names.includes("name");
            return exist;
        });
        //
        //Map the entities of interest into a key value pairs.
        const roles = interest.map(entity => {
            //
            //Key is the name of the entity
            const name = entity.name;
            //
            //Return the complete role structure
            return { name, value: name };
        });
        return roles;
    }
}
//An entity is a mutall object that models the table of a relational database
class entity extends schema {
    dbase;
    static_entity;
    //
    //Every entity has a collection of column inmplemented as maps to ensure type integrity
    //since js does not support the indexed arrays and yet columns are identified using their 
    //names.
    //This property is optional because some of the entities eg view i.e selectors do not have 
    //columns in their construction  
    columns;
    // 
    //The long version of a name that is set from this entity's comment 
    title;
    //
    //Every entity is identified uniquely by a name 
    name;
    //
    //Define the sql used for uniquely identifying a record of this entity
    //in a friendly way. The result of this sql is used for driving a record
    //selector. The sql is derived when needed. 
    id_sql_ = null;
    //
    //Defne the identification index fields in terms of column objects. This
    //cannot be done at concstruction time (becase the order of building 
    //dataase.entities is not guranteed to follow dependency). Hense the 
    //use of a getter
    ids_ = null;
    //
    //static object of the indices that are used to activate the ids 
    indices;
    //
    //the depth of this entity as derived from php
    depth;
    //
    //The goup tag that holds the html of this entity including the attributes 
    group;
    //
    //Construct an entity using:-
    //a) the database to be its parent through the has-a hierarchy
    //b) the static information typically obtained using a s sever-side scripting
    //language, e.g. PHP
    constructor(
    //
    //The parent of this entity which is the database establishing the reverse 
    //connection from the entity to its parent. it is protected to allow this 
    //entity to be json encoded. Find out if this makes any diference in js 
    //The datatype of this parent is a database since an entity can only have a 
    //database origin
    dbase, 
    //
    //The static structure from which this entity is formulated. it is mostly derived 
    //from php. It is of type any since it is a object
    static_entity) {
        //
        //Initialize the parent so thate we can access 'this' object
        super(`${dbase.name}.${static_entity.name}`);
        this.dbase = dbase;
        this.static_entity = static_entity;
        //
        //
        //Offload the properties of the static structure (including the name)
        Object.assign(this, static_entity);
        //
        //Use the static data to derive javascript column objects as a map 
        this.columns = this.activate_columns();
        //
        //unique name of this entity 
        this.name = static_entity.name;
        //
        this.depth = static_entity.depth;
        //
        //activate any imported errors
        this.activate_errors(static_entity.errors);
        //
        //Define the sql used for uniquely identifying a record of this entity
        //in a friendly way. The result of this sql is used for driving a record
        //selector. The sql is derived when needed. 
        this.id_sql_ = null;
        //
        //initialize the indices 
        this.indices = static_entity.indices;
        //
        //Defne the identification index fields in terms of column objects. This
        //cannot be done at concstruction time (becase the order of building 
        //dataase.entities is not guranteed to follow dependency). Hense the 
        //use of a getter
        this.ids_ = null;
        //
        //initialize the sqv group element for presentation purpses
        this.group = document.createElement('g');
    }
    //Activate the columns of this entity where the filds are treated just like 
    //attributes for display
    activate_columns() {
        //
        //Begin with an empty map collection
        let columns = {};
        //
        //Loop through all the static columns and activate each of them
        for (let cname in this.static_entity.columns) {
            //
            //Get the static column
            let static_column = this.static_entity.columns[cname];
            //
            //Define a dynamic column
            let dynamic_column;
            //
            switch (static_column.class_name) {
                //
                case "primary":
                    dynamic_column = new primary(this, static_column);
                    columns[static_column.name] = dynamic_column;
                    break;
                case "attribute":
                    dynamic_column = new attribute(this, static_column);
                    columns[static_column.name] = dynamic_column;
                    break;
                case "foreign":
                    dynamic_column = new foreign(this, static_column);
                    columns[static_column.name] = dynamic_column;
                    break;
                case "field":
                    dynamic_column = new attribute(this, static_column);
                    columns[static_column.name] = dynamic_column;
                    break;
                default:
                    throw new mutall_error(`Unknown column type 
                    '${static_column.class_name}' for ${this.name}.${static_column.name}`);
            }
        }
        return columns;
    }
    //Defines the identification columns for this entity as an array of columns this 
    //process can not be done durring the creation of the entity since we are not sure 
    //about the if thses column are set. hence this function is a getter  
    get ids() {
        //
        //Return a copy if the ides are already avaible
        if (this.ids_ !== null)
            return this.ids_;
        //
        //Define ids from first principles
        //
        //Use the first index of this entity. The static index imported from 
        //the server has the following format:-
        //{ixname1:[fname1, ...], ixname1:[....], ...} 
        //We cont know the name of the first index, so we cannot access directly
        //Convert the indices to an array, ignoring the keys as index name is 
        //not important; then pick the first set of index fields
        if (this.indices === undefined || null) {
            return null;
        }
        // 
        //
        const fnames = this.indices[0];
        //
        //If there are no indexes save the ids to null and return the null
        if (fnames.columns.length === 0) {
            return null;
        }
        //
        //Activate these indexes to those from the static object structure to the 
        //id datatype that is required in javascript 
        // 
        //begin with an empty array
        let ids = [];
        // 
        //
        fnames.columns.forEach(name => {
            //
            //Get the column of this index
            const col = this.columns[name];
            if (col === undefined) { }
            else {
                ids.push(col);
            }
        });
        return ids;
    }
    //Returns the relational dependency of this entity based on foreign keys
    get dependency() {
        //
        //Test if we already know the dependency. If we do just return it...
        if (this.depth !== undefined)
            return this.depth;
        //
        //only continue if there are no errors 
        if (this.errors.length > 0) {
            return null;
        }
        //...otherwise calculate it from 1st principles.
        //
        //Destructure the identification indices. They have the following format:-
        //[{[xname]:[...ixcnames]}, ...]
        //Get the foreign key column names used for identification.
        //
        //we can not get the ddependecy of an entity if the entity has no ids 
        if (this.ids === null) {
            return null;
        }
        //
        //filter the id columns that are foreigners
        let columns = [];
        this.ids.forEach(col => { if (col instanceof foreign) {
            columns.push(col);
        } });
        //
        //Test if there are no foreign key columns, return 0.
        if (columns.length === 0) {
            return 0;
        }
        else {
            //Map cname's entity with its dependency. 
            const dependencies = columns.map(column => {
                //
                //Get the referenced entity name
                const ename = column.ref.table_name;
                //
                //Get the actual entity
                const entity = this.dbase.get_entity(ename);
                //
                //Get the referenced entity's dependency.
                return entity.dependency;
            });
            //
            //remove the nulls
            const valids = dependencies.filter(dep => { return dep !== null; });
            //
            //Get the foreign key entity with the maximum dependency, x.
            const max_dependency = Math.max(...valids);
            //
            //Set the dependency
            this.depth = max_dependency;
        }
        //
        //The dependency to return is x+1
        return this.depth;
    }
}
//Modelling the column of a table. This is an absract class. 
class column extends schema {
    //
    //Every column if identified by a string name
    name;
    //
    //Every column has a parent entity 
    entity;
    //
    //The static php structure used to construct this column
    static_column;
    //
    //Boolean that tests if this column is primary 
    is_primary;
    // 
    //This is the descriptive name of this column 
    //derived from the comment 
    title;
    //
    //Html used to display this column in a label format
    view;
    //
    //The construction details of the column includes the following
    //That are derived from the information schema  and assigned 
    //to this column;- 
    //
    //Metadata container for this column is stored as a structure (i.e., it
    //is not offloaded) since we require to access it in its original form
    comment;
    //
    //The database default value for this column 
    default;
    //
    //The acceptable datatype for this column e.g the text, number, autonumber etc 
    data_type;
    //
    //defined if this column is mandatory or not a string "YES" if not nullable 
    // or a string "NO" if nullable
    is_nullable;
    // 
    //The maximum character length
    length;
    //
    //The column type holds data that is important for extracting the choices
    //of an enumerated type
    type;
    // 
    //The following properties are assigned from the comments  field;
    // 
    //This property is assigned for read only columns 
    read_only;
    // 
    //A comment for tagging columns that are urls.
    url;
    //
    //These are the multiple choice options as an array of key value 
    //pairs. 
    select;
    //
    //The class constructor that has entity parent and the json data input 
    //needed for defining it. Typically this will have come from a server.
    constructor(parent, static_column) {
        //
        //Initialize the parent so that we can access 'this' object
        super(`${parent.dbase.name}.${parent.name}.${static_column.name}`);
        //
        //Offload the stataic column properties to this column
        Object.assign(this, static_column);
        //
        this.entity = parent;
        this.static_column = static_column;
        this.name = static_column.name;
        //
        //Primary kys are speial; we neeed to identify thm. By default a column
        //is not a primary key
        this.is_primary = false;
        //
        //Html used to display this column in a label format
        this.view = document.createElement('label');
    }
}
//Modelling the non user-inputable primary key field
class primary extends column {
    //
    //The class contructor must contain the name, the parent entity and the
    // data (json) input 
    constructor(parent, data) {
        //
        //The parent colum constructor
        super(parent, data);
        //
        //This is a primary key; we need to specially identify it.
        this.is_primary = true;
    }
    //
    //
    //popilates the td required for creation of data as a button with an event listener 
    create_td() {
        //
        //Create the td to be returned
        const td = document.createElement('td');
        //
        //Set the attributes
        td.setAttribute("name", `${this.name}`);
        td.setAttribute("type", `primary`);
        td.textContent = ``;
        //
        return td;
    }
}
//Modellig foreign key field as an inputabble column.
class foreign extends column {
    //
    //The reference that shows the relation data of the foreign key. It comprises
    //of the referenced database, table and column names
    ref;
    //
    //For the presentation of this relation (in Lawrence's metavisuo?)
    line;
    //
    //Construct a foreign key field using :-
    //a) the parent entity to allow navigation through has-a hierarchy
    //b) the static (data) object containing field/value, typically obtained
    //from the server side scriptig using e.g., PHP.
    constructor(parent, data) {
        //
        //Save the parent entity and the column properties
        super(parent, data);
        //
        //Extract the reference details from the static data
        this.ref = {
            table_name: this.static_column.ref.table_name,
            db_name: this.static_column.ref.db_name,
            cname: this.static_column.ref.cname
        };
    }
    //
    //Returns the type of this relation as either a has_a or an is_a inorder to 
    //present differently using diferent blue for is_a and black for has_a
    get_type() {
        //
        //Test if the type is undefined 
        //if undefined set the default type as undefined 
        if (this.static_column.comment.type === undefined || this.static_column.comment.type === null) {
            //
            //set the default value 
            const type = 'has_a';
            return type;
        }
        //
        //There is a type by the user return the type
        else {
            const type = this.static_column.comment.type.type;
            return type;
        }
    }
    //The referenced entity of this relation will be determined from the 
    //referenced table name on request, hence the getter property
    get_ref_entity() {
        //
        //Let n be table name referenced by this foreign key column.
        const n = this.ref.table_name;
        //
        //Return the referenced entity using the has-hierarchy
        return this.entity.dbase.entities[n];
    }
    //
    //Populates the td required for creation of data as a button with an event 
    //listener (to support metavisuo work)
    create_td() {
        //
        //Create the td to be returned
        const td = document.createElement('td');
        //
        //Set the inner html of this td 
        td.setAttribute('type', 'foreign');
        td.setAttribute('name', `${this.name}`);
        td.setAttribute('ref', `${this.ref.table_name}`);
        td.setAttribute('id', `0`);
        td.setAttribute('title', `["0",null]`);
        td.setAttribute('onclick', `record.select_td(this)`);
        //
        //Set the text content to the name of this column 
        td.textContent = `${this.name}`;
        //
        //return the td
        return td;
    }
    //Tests if this foreign key is hierarchical or not
    is_hierarchical() {
        //
        //A foreign key represents a hierarchical relationship if the reference...
        //
        return (
        //...database and the current one are the same
        this.entity.dbase.name === this.ref.db_name
            //
            //...entity and the current one are the same
            && this.entity.name === this.ref.table_name);
    }
}
//Its instance contains all (inputable) the columns of type attribute 
class attribute extends column {
    //
    //The column must have a name, a parent column and the data the json
    // data input 
    constructor(parent, data) {
        //
        //The parent constructor
        super(parent, data);
    }
    //
    //popilates the td required for creation of data as a button with an event listener 
    create_td() {
        //
        //Create the td to be returned
        const td = document.createElement('td');
        //
        //Set the inner html of this td 
        td.setAttribute('type', 'attribute');
        td.setAttribute('name', `${this.name}`);
        td.setAttribute('onclick', `record.select_td(this)`);
        td.innerHTML = '<div contenteditable tabindex="0"></div>';
        //
        return td;
    }
}
//
//
export { database, entity, column, attribute, primary, foreign };
