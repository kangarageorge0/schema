<?php
//
//The mutall namespace
namespace mutall;
//
//Resolve the reference to the twilio class.
include_once "../twilio/twilio.php";
//
//Resolve the reference to the mailer class
// include_once "../mailer/mailer.php";
//
//Resolve the reference to the database
include_once "./schema.php";
//
//This is the messenger class that focuses on sending emails and SMS's to 
//multiple users by retrieving the user's email and the user's phone_number from
//the database and sending a message for each user.
class messenger extends component{
    //
    //The twilio class
    protected twilio $twilio;
    //
    //The database class that supports querying the database
    protected database $dbase;
    //
    //Instantiate the twilio and mailer classes at this point
    function __construct()
    {
        //
        //Connect to the database
        $this->dbase = new database("mutall_users");
        //
        //Open the twilio class
        $this->twilio = new twilio();
    }

    //
    //Send an sms to the recipient who is either:-
    //- a group (where we send to all the members of the business).
    //- or selected individuals of the business.
    private function send_sms(object $recipient, string $subject, string $body):array/*<error>*/{
         //
        //Get the recipient addresses. 
        $addresses = $this->get_addresses($recipient);
        //
        //Loop through the addresses sending an sms to each one.
        foreach ($addresses as $address) {
            //
            //Compile the complete address including the country code.
            $phone = $address;
            //
            //Send the message using twilio technology.
            $result/*'ok' | error*/ = $this->twilio->send_message($phone, $subject, $body);
            //
            //Log the error if any.
            if ($result != 'ok')
                array_push($this->errors, "The sms to '$address' was not succesfully sent for the following reasons:'$result'.");
        }
        //
        //Return the errors if any.
        return $this->errors;
    }
    //
    //Get the addresses of the recipient(s) to send the messages.
    //The recipient type has the following structure:-type recipient =
    //
    //A group has a business id used to get all members associated with that group
    //{ type: 'group', business: outlook.business }
    //
    //The individual has a name which is used to retrieve his/her email address or
    // the mobile number
    //| { type: 'individual', user: Array<string> }
    private function get_addresses($recipient): array{
        //
        //if the recipient is of type business...
        if ($recipient->type == "group"){
            //
            //Get all the addresses associated with this business.
            //
            //Get the business: it has the following structure:-
            // business = {id: string, name:string}
            $business = $recipient->business;
            //
            // Formulate the condition(recipients) to retrieve the data
            $condition = "business.id = '$business->id'";
        }else {
            //
            //The recipient is of type individual. Get their addresses.
            //
            //Get the user: its an array of user name.
            //user: Array<string> 
            $users_array = $recipient->user;
            //
            //Formulate a condition that involves this users
            $users_str = join( ',',array_map(fn($user)=> "'$user'", $users_array));
            //
            //Formulate the sql to get the phone number of the selected user.
            $condition = "user.name in ($users_str)";
            //
        }
        //
        //Use the recipient condition to formulate the complete sql.
        $sql =
            "with
                #
                #Get the primary phone number of each user
                mobile as(
                    select
                        concat(mobile.prefix,mobile.num) as num,
                        row_number() over(partition by mobile.user) as users
                    from mobile
                        inner join user on mobile.user= user.`user`
                        inner join member on member.user= user.user 
                    where $condition
                )
                #
                #Select all users with phone numbers linked to a business
                select * from mobile where users=1";
        //
        // Get the adresses from the above query.
        $adresses = $this->dbase->get_sql_data($sql);
        //
        //Return the adresses.
        return $adresses;
    }
    //
    //This function sends emails and sms's to the given recipient.
    //The recipient is either an individual or 
    //a group.The recipient type has the following structure:-
    //{"group", business}|{"individual",user_name}
    //The return is an array of errors if any
    public function send(object $recipient, string $subject, string $body,array $technology =['email']): array {
        //
        //2. Send the phone messages and register errors (if any)in the errors property
        if(in_array('sms', $technology))$this->send_sms($recipient, $subject, $body);
        //
        //Return the errors if any
        return $this->errors;
    }
}
