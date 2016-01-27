# Gitsub
For now this simply runs in the parent module directory and syncs the parent module and then all of the submodules.

This util is meant to be run on the command line, to install use the following command:

```
npm install -g gitsub
```

Now you can navigate to a directory containing a parent repo and run the command ```gitsub```.

This also accepts a flag for which branch you want each submodule to checkout to, e.g.: 

```gitsub --develop``` or ```gitsub --working-branch```


####Note: 

Currently running into an issue when too many submodules have changes, spooling up too many processes, you might see an error like:
```/Applications/Xcode.app/Contents/Developer/usr/libexec/git-core/git-<tool>: fork: Resource temporarily unavailable```

Simply running gitsub again should resolve any submodules that were unhandled in the first pass.
I didn't start seeing this until we had multiple changes in 70+ submodules; YMMV.
