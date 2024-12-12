import Array "mo:base/Array";
import Debug "mo:base/Debug";
import Int "mo:base/Int";
import Iter "mo:base/Iter";
import Nat "mo:base/Nat";
import Option "mo:base/Option";
import Time "mo:base/Time";
import Error "mo:base/Error";

module {
  public type Group = {
    name : Text;
    groups : [Group];
    its : [It];
  };

  public type It = {
    name : Text;
    test : shared () -> async Bool;
    skip : Bool;
    pending : Bool;
  };

  public func describe(name : Text, groups : [Group]) : Group = {
    name = name;
    groups = groups;
    its = [];
  };

  public func it(name : Text, test : shared () -> async Bool) : It = {
    name = name;
    test = test;
    skip = false;
    pending = false;
  };

  public func skip(name : Text, test : shared () -> async Bool) : It = {
    name = name;
    test = test;
    skip = true;
    pending = false;
  };

  public func pending(name : Text, test : shared () -> async Bool) : It = {
    name = name;
    test = test;
    skip = false;
    pending = true;
  };

  public func assertTrue(x : Bool) : Bool {
    x
  };

  public func run(groups : [Group]) : async Bool {
    var failed = false;
    let startTime = Time.now();

    for (group in groups.vals()) {
      Debug.print("== " # group.name # " ==");
      for (group1 in group.groups.vals()) {
        Debug.print("== " # group1.name # " ==");
        for (it in group1.its.vals()) {
          if (it.skip) {
            Debug.print("Skipped: " # it.name);
          } else if (it.pending) {
            Debug.print("Pending: " # it.name);
          } else {
            try {
              let success = await it.test();
              if (success) {
                Debug.print("✓ " # it.name);
              } else {
                failed := true;
                Debug.print("✗ " # it.name);
              };
            } catch e {
              failed := true;
              Debug.print("✗ " # it.name # " - " # Error.message(e));
            }
          }
        };
      };
    };

    let endTime = Time.now();
    Debug.print("Completed in " # Int.toText((endTime - startTime) / 1_000_000) # "ms");
    not failed
  };
}; 