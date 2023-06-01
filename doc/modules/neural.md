---
layout: doc
title: Neural network module
---

# Neural network module

Neural network module is an experimental module that allows to perform post-classification of messages based on their current symbols and some training corpus obtained from the previous learns.

To use this module in versions prior to Rspamd 2.0, ranging from Rspamd 1.7 up to version 2.0, you must build Rspamd with `libfann` support. Although it is typically enabled when using pre-built packages, you may specify it using `-DENABLE_FANN=ON` with the `cmake` command during the building process.

Since Rspamd 2.0, the `libfann` module has been replaced with [kann](https://github.com/attractivechaos/kann) to provide more powerful neural network processing, making it the preferred option for all new installations.

The Neural Network learns by classifying messages as spam or ham, and adjusting its parameters accordingly. Several heuristics are employed to achieve this, so it is not solely based on a plain score. You can also use your own criteria for learning.

The training occurs in the background, and once a certain amount of training is complete, the Neural Network is updated and stored in a Redis server. This allows scanners to load and update their own data.

After a set number of training iterations (by default, `10`), the training process removes the old Neural Network and begins training a new one. This ensures that old data does not influence the current processing. Once the Neural Network is trained, its data is saved into Redis, where all Rspamd scanners share their learning data. Additionally, intermediate training vectors are stored in Redis. The ANN and training data are compressed using the `zstd` compressor before being saved in Redis.

## Configuration

By default, this module is explicitly **disabled**, so you will need to enable it either in the local or override configuration.

Ensure that at least one Redis server is [specified]({{ site.baseurl }}/doc/configuration/redis.html) in the common `redis` section. Alternatively, you can define the Redis server in the module configuration:

~~~ucl
# local.d/neural.conf
servers = "localhost";
enabled = true; # Important after 1.7
~~~

It is also necessary to **define the scores** for symbols added by this module, as they are set to zero by default. To accomplish this, you must edit the `local.d/neural_group.conf` file:

~~~ucl
# local.d/neural_group.conf

symbols = {
  "NEURAL_SPAM" {
    weight = 3.0; # sample weight
    description = "Neural network spam";
  }
  "NEURAL_HAM" {
    weight = -3.0; # sample weight
    description = "Neural network ham";
  }
}
~~~

### Configuration options

The neural networks module supports various configuration options for setting up different neural networks. Starting from version 1.7, it supports multiple rules with both automatic and non-automatic neural networks. However, this configuration is usually too advanced for general usage.

By default, you can use the old configuration style, such as:

~~~ucl
# local.d/neural.conf

servers = "127.0.0.1:6379";

train {
  max_trains = 1k; # Number ham/spam samples needed to start train
  max_usages = 20; # Number of learn iterations while ANN data is valid
  learning_rate = 0.01; # Rate of learning
  max_iterations = 25; # Maximum iterations of learning (better preciseness but also lower speed of learning)
}

ann_expire = 2d; # For how long ANN should be preserved in Redis
~~~

In this code snippet, we define a simple network that automatically learns ham and spam on messages with corresponding actions. Upon creation, it is allowed to undergo additional training for up to 20 more times. Rspamd trains a neural network when `(ham_samples + spam_samples) >= max_trains`. It also automatically maintains equal proportions of spam and ham samples to provide fair training. If you are running a small email system, then you can increase `max_usages` to preserve trained networks for a longer time (you may also adjust `ann_expire` accordingly).

Rspamd can use the same neural network from multiple processes running on multiple hosts across the network. It is guaranteed that processes with different configuration symbols enabled will use different neural networks (each network has a hash of all symbols defined as a suffix for Redis keys). Furthermore, there is a guarantee that all learning will be done in a single process that atomically updates neural network data after learning.

### Settings usage

Rspamd automatically selects different networks for different sets of [user settings](../configuration/settings.html) based on their settings ID. The settings ID is appended to the neural network name to identify which network to use. This feature can be useful for splitting neural networks for inbound and outbound users identified by settings.

To set which rules in `neural.conf` apply to different settings IDs, you can either set `allowed_settings = "all";` in the rules section to allow messages with all possible settings IDs to train the rule, or `allowed_settings = [ "settings-id1", "settings-id2" ];` to allow only messages with specific settings IDs to do so.

### Multiple networks

Starting from version 1.7, Rspamd offers support for multiple neural networks that can be defined in the configuration. This feature can be useful when setting up long or short neural networks, where one network has a high `max_usages` and a large `max_trains`, while the other reacts quickly to newly detected patterns. However, in practice, this setup is not usually more effective, so it is recommended to use a single network instead.

~~~ucl
# local.d/neural.conf
rules {
  "LONG" {
    train {
      max_trains = 5000;
      max_usages = 200;
      max_iterations = 25;
      learning_rate = 0.01,
    }
    symbol_spam = "NEURAL_SPAM_LONG";
    symbol_ham = "NEURAL_HAM_LONG";
    ann_expire = 100d;
  }
  "SHORT" {
    train {
      max_trains = 100;
      max_usages = 2;
      max_iterations = 25;
      learning_rate = 0.01,
    }
    symbol_spam = "NEURAL_SPAM_SHORT";
    symbol_ham = "NEURAL_HAM_SHORT";
    ann_expire = 1d;
  }
}
~~~

~~~ucl
# local.d/neural_group.conf

symbols = {
  "NEURAL_SPAM_LONG" {
    weight = 3.0; # sample weight
    description = "Neural network spam (long)";
  }
  "NEURAL_HAM_LONG" {
    weight = -3.0; # sample weight
    description = "Neural network ham (long)";
  }
  "NEURAL_SPAM_SHORT" {
    weight = 2.0; # sample weight
    description = "Neural network spam (short)";
  }
  "NEURAL_HAM_SHORT" {
    weight = -1.0; # sample weight
    description = "Neural network ham (short)";
  }
}
~~~


### Manual learning

*This is a work-in-progress*.

If you set `store_pool_only = true` in the `train` options, the neural module will store training vectors in MessagePack format and a profile digest in the task cache instead of performing online learning. These can then be saved to, for example, ClickHouse and used at a later time.

The configuration snippet below shows how to save these to ClickHouse:

~~~
# local.d/clickhouse.conf
extra_columns = {
	Neural_Vec = {
		selector = "task_cache('neural_vec_mpack')";
		type = "String";
		comment = "Training vector for neural";
        }
	Neural_Digest = {
		selector = "task_cache('neural_profile_digest')";
		type = "String";
		comment = "Digest of neural profile";
        }
}
~~~

The controller endpoint `/plugins/neural/learn` facilitates manual training of neural networks & accepts a JSON POST with the following keys:

 * `spam_vec` and `ham_vec`: are lists of lists of numbers containing training information
 * `rule` is an optional name of the rule to perform training for
