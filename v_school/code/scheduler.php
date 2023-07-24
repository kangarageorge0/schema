<?php
//
namespace mutall;
//
//Resolve the reference to the database
require_once 'schema.php';
//
//The scheduler is responsible for creating jobs that are repetitive and those
//that are not repetitive.
class scheduler extends component {
    //
    //The job name.
    public string $job_name;
    //
    //constructor
    function __construct() {
        //
        //The crontab data file???
        $this->crontab_data_file = component::crontab_file;
        //
        //
        //Establish a connection to the database(using an incomplete database)
        $this->database = new database("mutall_users", false);
    }
    //
    //Scheduling the requested job
    public function execute(
        //
        //The job name to schedule.
        string $job_name,
        //
        //It is true when we need to rebuild the crontab, otherwise it is false
        bool $update,
        //
        //The list of at commands as defined in the run_at_commands() below
        array/*<at>*/ $ats
    ): array /*errors|output*/ {
        //
        //Save the job for further reference.
        $this->job_name = $job_name;
        //
        //2. Refresh the crontab if necessary
        if ($update) $this->update_cronfile();
        //
        //1. Issue the at commands
        //Loop through all the at commands and execute each one of them
        foreach ($ats as $at) {
            $this->run_at_command($at);
        }
        //
        //Return the collected errors
        return $this->errors;
    }
    //
    //Run the at commands on a given date with a specific message
    /**
     * 
    The at command is either for:-
    type at =
        //
        //- sending a message indirectly using a job number(from which the message
        //can be extracted from the database)
        { type: "message", datetime: string, message: number,recipient:recipient }
        //
        //- or for initiating a fresh cronjob on the specified date
        | { type: "refresh", datetime:string 
        //
        | {type: "other", datetime: string, command: string};
     */
    public function run_at_command(object $at): void {
        //
        //Set the home directory reference for the comand.
        $home = component::home;
        //
        //Set the log file to record the errors if any.
        $log = component::log_file;
        //
        //Get the date of when to run the at command.
        $datetime = $at->datetime;
        //
        //Get the date from the datetime component.
        $date = $this->get_date($datetime);
        //
        //Get the time to run the at command from the datetime.
        $time= $this->get_time($datetime);
        //
        //There are three types of at commands:- 
        switch ($at->type) {
            //
            case "message":
                //
                //A command for sending a message to a user at a specified time.
                //
                //Get the message to send as a job.
                $msg = $at->message;
                //
                //We also need the type of recipient(individual or group) 
                //to send the message.
                $type = $at->recipient->type;
                //
                //Get the message recipeint depending on the type.
                $recipient = $type === "group" ? $at->recipient->business->id : $at->recipient->user;
                //
                //Formulate the linux command to run.
                //
                //The command parameters. They are:- msg(job_number),type(of
                //recipient), and extra(further details depending on the type
                //of recipient).
                $parameters = "$msg $type $recipient";
                //
                //The command to execute at the requested time.
                $command = "$home/scheduler_messenger.php $parameters";
                break;
                //
            case "refresh":
                //
                //The command for rebuilding the crontab
                $command = "$home/scheduler_crontab.php";
                break;
            //
            case "other":
                //
                //A user defined command to run.
                $command = $at->command;
                break;
            //
            default: 
                //
                //Any other unhandled type should be reported as an error.
                throw new \Exception("Command type for an at job is not supported.");
        }
       //
        //Construct the command to be executed at the requested date. All the at 
        //commands are constrained to run at midday.
        $exe = "echo '$command' | at $time $date >> $log";
        //
        //Execute the command and collect the results.
        //(Put the shell_exe in component class).
        $result = shell_exec($exe);
        //
        //If the result is null, there is a problem with the at command.
        if(is_null($result)){
            //
            //Log the error
            array_push($this->errors, "This at command '$exe' returned an unexpected null.");
            //
            //Stop the process.
            return;
        }
        //
        //Test whether the at command executed at all.
        if(!$result){
            //
            array_push($this->errors, "The at command '$exe' failed to execute.");
        }
        //
        //The at command executed with a message.
        //
        //Test whether the result suggest a successful 'at' command execution or
        //not. If not succesful, log the error otherwise save the 'at' command
        //reference number.
        //
        //let ref be the at command reference number
        $number = null;
        //
        if($this->successful($result, $number)){
            //
            //The 'at' command was succesful, retrieve the reference numnber and
            //save it against the 'at' command.
            $output = $this->save_at_command($at, $number);
            //
            //Check the result of the save.Ideally we should rollback the at 
            //command and log the error. For this version we shall just report 
            //the error.
            if($output !== 'ok') array_push($this->errors, $output);
        }else {
            //
            //The at command failed so log the error in our error collection.
            array_push($this->errors, $result);
        }
    }
    //
    //Check the at command as it has executed successfully and extract 
    //the job number of the at command.
    public function successful($input, &$number): bool {
        //
        //A successful at command has the following signature.
        // job 196 at Fri Sep 23 13:02:00 2022
        //
        //Extract the job number from the signature.
        $result/*0|1| false */ = preg_match('/job \s*(\d+)/', $input, $matches);
        //
        //Test whether the preg match succeded. It is false if it failed.
        if($result === false) throw new \Exception("There is no job number in '$input'.");
        //
        //If the result is 0, the match succeeded but the partern was not found.
        //This means that the cron job ran successfully but found an error.
        //Report the error.
        if($result === 0) return false;
        //
        //If the result is not equal to 1. Something went wrong in the preg_match.
        //So report it
        if ($result !== 1) throw new \Exception("Preg_match returned with unexpected result '$result'.");
        //
        //Extract the job number from the matches Its the second index of the element.
        $number = $matches[1];
        //
        //This is a successful at command execution.
        return true;
    }
    //
    //Save the extracted job number to the databse alongside the specific 'at' command.
    public function save_at_command($at, $number): string/*ok | error*/ {
        //
        //Get the labels required to save this at command.
        $layouts = [
            //
            //Get the at job number.
            [$this->db, "at", [], "num", $number],
            //
            //Get the 'at' command.
            [$this->db, "at", [], "name", $at],
            //
            //Get the at job.
            [$this->db, "job", [], "name", $this->job_name]
        ];
        //
        //Get the questionnaire.
        $quest = new questionnaire($layouts);
        //
        //For this saving, use the most common saving method.
        $report = $quest->load_common();
        //
        //return the result.
        return $report;        
    }
    //
    //Get the date from the datetime component.
    public function get_date($datetime){
        //
        //Get the date.
        $date = date_create($datetime);
        //
        //Return the date.
        return date_format($date, "Y/m/d");
    }
    //
    //Get the time from the datetime component.
    public function get_time($datetime){
        //
        //Get the  time.
        $time = date_create($datetime);
        //
        //Return the time.
        return date_format($time, "H:i:s");
    }
    //
    //Refreshing the cronfile with the newly created crontab. This method runs a
    //query that extracts all jobs that are active. i.e jobs started earlier than 
    //today and end later than today. start_date<job>end_date
    public function update_cronfile(): void {
        //
        //1. Formulate the query that gets all the current jobs 
        //i.e., those whose start date is older than now and their end date is
        //younger than now(start_date <= now()< end_date)
        $sql = '
            select 
                job.name,
                job.msg,
                job.command,
                job.recursion->>"$.repetitive" as repetitive,
                recursion->>"$.start_date" as start_date,
                recursion->>"$.end_date" as end_date,
                recursion->>"$.frequency" as frequency 
            from job 
            where job.recursion->>"$.repetitive"="yes" 
            and recursion->>"$.start_date"<= now()<recursion->>"$.end_date"
            ';
        //
        //2. Run the query and return the results
        $jobs = $this->database->get_sql_data($sql);
        //
        //3. Initialize the crontab entries
        $entries = "";
        //
        //4. Loop over each job, extracting the frequency as part of the entry.
        foreach ($jobs as $job) {
            //
            //Get the frequency of the job
            $freq = $job['frequency'];
            //
            //The crontab entry for sending messages
            $entry = "$freq " . component::crontab_command . " " . $job['job'] . "\n";
            //
            //Add it to the list of entries
            $entries .= $entry;
            //
            //modify the permissions to allow saving the job to the database
            shell_exec("chmod 777 ".component::crontab_command);
        }
        //
        //5. Create a cron file that contains all crontab entries.
        file_put_contents($this->crontab_data_file, $entries);
        //
        //Modify the file permissions
        shell_exec("chmod 777 $this->crontab_data_file");
        //
        //6. Compile the cronjob. 
        //NOTE:- The php user is identified by www-data
        //and a user needs permissions to set up a crontab otherwise it wont execute
        $command = "crontab ". component::user . $this->crontab_data_file;
        //  
        //7. Run the cron job
        $result = shell_exec($command);
        //
        //At this the shell command executed successfully
        if (is_null($result)){
            //
            //This is a successful execution. Return nothing
            return;
        }
        //At this the shell command executed successfully or it failed. Test whether
        //it failed or not.
        if (!$result)
            throw new \Exception("The crontab command for '$command' failed with the "
                    . "following '$result'");
        //
        //The shell command succeced with a resulting (error) message. Add it to
        //the error collection for reporting purposes.
        array_push($this->errors,$result); 
    }
}
