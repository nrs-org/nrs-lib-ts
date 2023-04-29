# nrs-lib-ts

the core library of my [nrs](https://github.com/ngoduyanh/nrs) implementation.

this provides data structures (`Entry`, `Impact`, `Relation`, etc.) and
functions to operate on them, as well as some togglable extensions.

since this is an implementation, it describe a nrs system, not a core system,
many extensions like `DAH_entry_id`, `DAH_entry_id_impl` and `DAH_meta`
are implicitly enabled (these extensions can not be disabled), which means
that the non-extension specific code may not be able to integrate into
a generic nrs implementation (which basically does not exist because only
i have mental illness).

## 📄 License

this thing is licensed under gplv3 because autism
