# Filesystem

- Align your disk partitions with your RAID configuration.
- Avoid using NFS drives.
- VMware virtual drives should be used over NFS (for Virtual Boxes).
- Linux/Unix: format your drives into XFS or EXT4. XFS performs better.
- If using RAID, you may need to configure XFS with your RAID geometry.
- Windows: use the NTFS file system. Do not use any FAT file system (i.e. FAT 16/32/exFAT).

# Hardware

Use RAID10 and SSD drives for optimal performance.

# Operating System Configuration

## Linux

- Turn off transparent hugepages. [Transparent Hugepages Guide](#transparent-hugepages-guide)

- Set readahead between 8 and 32 regardless of storage media type.

- Use the noop or deadline disk schedulers for SSD drives.

- Use the noop disk scheduler for virtualized drives in guest VMs.

- Disable NUMA or set vm.zone_reclaim_mode to 0 and run mongod instances with node interleaving. See: MongoDB and NUMA Hardware for more information. [Disable NUMA](#disable-numa)

- Adjust the ulimit values on your hardware to suit your use case. If multiple mongod or mongos instances are running under the same user, scale the ulimit values accordingly. [Adjust ULimit](#adjust-ulimit)

- Use noatime for the dbPath mount point. (/etc/fstab) [how to modify fstab](https://www.man7.org/linux/man-pages/man5/fstab.5.html)

- Configure sufficient file handles (fs.file-max), kernel pid limit (kernel.pid_max), maximum threads per process (kernel.threads-max), and maximum number of memory map areas per process (vm.max_map_count) for your deployment. For large systems, the following values provide a good starting point:

```
fs.file-max value of 98000,
kernel.pid_max value of 64000,
kernel.threads-max value of 64000, and
vm.max_map_count value of 128000
```

- Ensure that your system has swap space configured. Refer to your operating system’s documentation for details on appropriate sizing.

- (Ensure that the system default TCP keepalive is set correctly. A value of 300 often provides better performance for replica sets and sharded clusters. See: Does TCP keepalive time affect MongoDB Deployments? in the Frequently Asked Questions for more information.) => not really needed, because the database is local

# Windows

Consider disabling NTFS “last access time” updates. This is analogous to disabling atime on Unix-like systems.
Format NTFS disks using the default Allocation unit size of 4096 bytes.

# Transparent Hugepages Guide

Transparent Huge Pages (THP) is a Linux memory management system that reduces the overhead of Translation Lookaside Buffer (TLB) lookups on machines with large amounts of memory by using larger memory pages.

However, database workloads often perform poorly with THP enabled, because they tend to have sparse rather than contiguous memory access patterns. When running MongoDB on Linux, THP should be disabled for best performance.

To ensure that THP is disabled before `mongod` starts, you should create a service file for your platform’s initialization system that disables THP at boot.

## Create a Service File

### Create the systemd unit file.

Create the following file at

> /etc/systemd/system/disable-transparent-huge-pages.service

Some versions of Linux use a different path, _check whether the path is correct_, and update the disable-transparent-huge-pages.service file accordingly.

```sh
[Unit]
Description=Disable Transparent Huge Pages (THP)
DefaultDependencies=no
After=sysinit.target local-fs.target
Before=mongod.service

[Service]
Type=oneshot
ExecStart=/bin/sh -c 'echo never | tee /sys/kernel/mm/transparent_hugepage/enabled > /dev/null'

[Install]
WantedBy=basic.target
NOTE
```

Prior to version 4.2, MongoDB also checks the THP defrag setting and presents a startup warning if defrag is enabled. As long as THP itself is disabled in the systemd unit file, MongoDB is unaffected by the defrag setting. However, to avoid this message, you may set defrag to never by adding the following additional line to the systemd unit file, just after the existing ExecStart statement:

```sh
ExecStart=/bin/sh -c 'echo never | tee /sys/kernel/mm/transparent_hugepage/defrag > /dev/null'
```

## Reload systemd unit files.

Run the following command to reload systemd unit files to make `disable-transparent-huge-pages.service` available for use:

```sh
sudo systemctl daemon-reload
```

## Start the service.

Start the service manually once to ensure that the appropriate THP setting has been changed:

```sh
sudo systemctl start disable-transparent-huge-pages
```

Verify that THP has successfully been set to [never] by running the following command:

```sh
cat /sys/kernel/mm/transparent_hugepage/enabled
```

## Configure your operating system to run it on boot.

To ensure that this setting is applied each time your system boots, run the following command:

```sh
sudo systemctl enable disable-transparent-huge-pages
```

# Disable NUMA

## Configuring NUMA on Windows

On Windows, memory interleaving must be enabled through the machine’s BIOS. Consult your system documentation for details.

## Configuring NUMA on Linux

On Linux, you must disable zone reclaim and also ensure that your mongod and mongos instances are started by `numactl`, which is generally configured through your platform’s init system. You must perform both of these operations to properly disable NUMA for use with MongoDB.

Disable zone reclaim with one of the following commands:

```sh
echo 0 | sudo tee /proc/sys/vm/zone_reclaim_mode
sudo sysctl -w vm.zone_reclaim_mode=0
```

Ensure that mongod and mongos are started by `numactl`. This is generally configured through your platform’s init system. Run the following command to determine which init system is in use on your platform:

```sh
ps --no-headers -o comm 1
```

Copy the default MongoDB service file:

```sh
sudo cp /lib/systemd/system/mongod.service /etc/systemd/system/
```

Edit the `/etc/systemd/system/mongod.service` file, and update the `ExecStart` statement to begin with:

```sh
/usr/bin/numactl --interleave=all
```

### EXAMPLE

If your existing `ExecStart` statement reads:

```sh
ExecStart=/usr/bin/mongod --config /etc/mongod.conf
```

Update that statement to read:

```sh
ExecStart=/usr/bin/numactl --interleave=all /usr/bin/mongod --config /etc/mongod.conf
```

Apply the change to systemd:

```sh
sudo systemctl daemon-reload
```

Restart any running mongod instances:

```sh
sudo systemctl stop mongod
sudo systemctl start mongod
```

If applicable, repeat these steps for any mongos instances.

# Adjust uLimit

Most UNIX-like operating systems, including Linux and macOS, provide ways to limit and control the usage of system resources such as threads, files, and network connections on a per-process and per-user basis. These “ulimits” prevent single users from using too many system resources. Sometimes, these limits have low default values that can cause a number of issues in the course of normal MongoDB operation.

### Resource Utilization

`mongod` and `mongos` each use threads and file descriptors to track connections and manage internal operations. This section outlines the general resource utilization patterns for MongoDB. Use these figures in combination with the actual information about your deployment and its use to determine ideal ulimit settings.

Generally, all mongod and mongos instances:

- track each incoming connection with a file descriptor and a thread.
- track each internal thread or pthread as a system process.
  mongod
- 1 file descriptor for each data file in use by the mongod instance.
- 1 file descriptor for each journal file used by the mongod instance when storage.journal.enabled is true.
- In replica sets, each mongod maintains a connection to all other members of the set.
- mongod uses background threads for a number of internal processes, including TTL collections, replication, and replica set health checks, which may require a small number of additional resources.

## mongos

In addition to the threads and file descriptors for client connections, mongos must maintain connections to all config servers and all shards, which includes all members of all replica sets.

For mongos, consider the following behaviors:

- mongos instances maintain a connection pool to each shard so that the mongos can reuse connections and quickly fulfill requests without needing to create new connections.
- You can limit the number of incoming connections using the `net.maxIncomingConnections run-time option`. By restricting the number of incoming connections you can prevent a cascade effect where the mongos creates too many connections on the mongod instances.

## Review and Set Resource Limits

### ulimit

You can use the ulimit command at the system prompt to check system limits, as in the following example:

```sh
$ ulimit -a
-t: cpu time (seconds)         unlimited
-f: file size (blocks)         unlimited
-d: data seg size (kbytes)     unlimited
-s: stack size (kbytes)        8192
-c: core file size (blocks)    0
-m: resident set size (kbytes) unlimited
-u: processes                  192276
-n: file descriptors           21000
-l: locked-in-memory size (kb) unlimited
-v: address space (kb)         unlimited
-x: file locks                 unlimited
-i: pending signals            192276
-q: bytes in POSIX msg queues  819200
-e: max nice                   30
-r: max rt priority            65
-N 15:                         unlimited
```

ulimit refers to the per-user limitations for various resources. Therefore, if your mongod instance executes as a user that is also running multiple processes, or multiple mongod processes, you might see contention for these resources. Also, be aware that the processes value (i.e. -u) refers to the combined number of distinct processes and sub-process threads.

On Linux, you can change ulimit settings by issuing a command in the following form:

```
ulimit -n <value>
```

There are both “hard” and the “soft” ulimits that affect MongoDB’s performance. The “hard” ulimit refers to the maximum number of processes that a user can have active at any time. This is the ceiling: no non-root process can increase the “hard” ulimit. In contrast, the “soft” ulimit is the limit that is actually enforced for a session or process, but any process can increase it up to “hard” ulimit maximum.

A low “soft” ulimit can cause `can't create new thread, closing connection` errors if the number of connections grows too high. For this reason, it is extremely important to set both ulimit values to the recommended values.

ulimit will modify both “hard” and “soft” values unless the -H or -S modifiers are specified when modifying limit values.

For many distributions of Linux you can change values by substituting the -n option for any possible value in the output of ulimit -a.

After changing the ulimit settings, you must restart the process to take advantage of the modified settings. On Linux, you can use the `/proc` file system to see the current limitations on a running process.

## Recommended ulimit Settings

Every deployment may have unique requirements and settings; however, the following thresholds and settings are particularly important for mongod and mongos deployments:

```sh
-f (file size): unlimited
-t (cpu time): unlimited
-v (virtual memory): unlimited [1]
-l (locked-in-memory size): unlimited
-n (open files): 64000
-m (memory size): unlimited [1] [2]
-u (processes/threads): 64000
```

**Always remember to restart your mongod and mongos instances after changing the ulimit settings to ensure that the changes take effect.**

For Linux distributions that use systemd, you can specify limits within the [Service] sections of service scripts if you start mongod and/or mongos instances as systemd services. You can do this by using resource limit directives.

Specify the Recommended ulimit Settings, as in the following example:

```sh
[Service]
# Other directives omitted
# (file size)
LimitFSIZE=infinity
# (cpu time)
LimitCPU=infinity
# (virtual memory size)
LimitAS=infinity
# (locked-in-memory size)
LimitMEMLOCK=infinity
# (open files)
LimitNOFILE=64000
# (processes/threads)
LimitNPROC=64000
```

Each systemd limit directive sets both the “hard” and “soft” limits to the value specified.

After changing limit stanzas, ensure that the changes take effect by restarting the application services, using the following form:

```
systemctl restart <service name>
```

**If you installed MongoDB via a package manager such as yum or apt, the service file installed as part of your installation already contains these ulimit values.**

## /proc File System

**This section applies only to Linux operating systems.**

The /proc file-system stores the per-process limits in the file system object located at /proc/<pid>/limits, where <pid> is the process’s PID or process identifier. You can use the following bash function to return the content of the limits object for a process or processes with a given name:

```sh
return-limits(){

     for process in $@; do
          process_pids=`ps -C $process -o pid --no-headers | cut -d " " -f 2`

          if [ -z $@ ]; then
             echo "[no $process running]"
          else
             for pid in $process_pids; do
                   echo "[$process #$pid -- limits]"
                   cat /proc/$pid/limits
             done
          fi

     done

}
```

You can copy and paste this function into a current shell session or load it as part of a script. Call the function with one the following invocations:

```sh
return-limits mongod
return-limits mongos
return-limits mongod mongos
```
