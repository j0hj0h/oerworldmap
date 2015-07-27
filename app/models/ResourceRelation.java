package models;

public class ResourceRelation {

  private final String mName;
  private final String mInverseName;

  // TODO: discuss sense of explicitly naming subject and object type (e. g.
  // "Person" and "Article")

  public ResourceRelation(String aName, String aInverseName) {
    mName = aName;
    mInverseName = aInverseName;
  }

  public ResourceRelation getInversed() {
    return new ResourceRelation(mInverseName, mName);
  }

}
