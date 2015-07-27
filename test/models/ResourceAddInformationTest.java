package models;

import java.io.IOException;
import java.util.Arrays;
import java.util.LinkedList;
import java.util.List;
import java.util.Map;

import org.junit.Assert;
import org.junit.Test;

import com.rits.cloning.Cloner;

public class ResourceAddInformationTest extends ResourceTestBase {

  @Test
  public void testPersonWithArticleWithoutId() {
    final Resource person = Resource
        .fromJson("{\"@type\":\"Person\",\"@id\":\"person00002\",\"workLocation\":{\"@type\":\"Place\",\"@id\":\"afcad4ac-9c27-44fe-b7c6-489b7a19cc27\",\"address\":{\"@type\":\"PostalAddress\",\"@id\":\"44c95321-b734-4bd8-b41b-5fb58352b03f\",\"addressCountry\":\"IT\"},\"mbox_sha1sum\":\"encryptedEmailAddressPerson00002\"}}");
    final Resource personAbout = new Resource();
    personAbout.put("authorOf", "article00001");
    person.put("about", personAbout);
    try {
      mRepo.addResource(person);
    } catch (IOException e) {
      e.printStackTrace();
    }
    try {
      Assert.assertEquals(person, mRepo.getResource("person00002"));
      Assert.assertNull(mRepo.getResource("article00001"));
    } catch (IOException e) {
      e.printStackTrace();
    }
  }

  @SuppressWarnings("unchecked")
  @Test
  public void testPersonWithArticleWithId() {

    // test raw data
    final Resource originalPerson = Resource
        .fromJson("{\"@type\":\"Person\",\"@id\":\"person00003\",\"workLocation\":{\"@type\":\"Place\",\"@id\":\"afcad4ac-9c38-44fe-b7c6-489b7a19cc27\",\"address\":{\"@type\":\"PostalAddress\",\"@id\":\"55c95321-b734-4bd8-b41b-5fb58352b03f\",\"addressCountry\":\"FR\"}},\"mbox_sha1sum\":\"encryptedEmailAddressPerson00003\"}");
    final Resource originalArticle = Resource
        .fromJson("{\"@type\":\"Article\",\"@id\":\"article00002\", \"about\":{\"name\":[\"Highly interesting\"], \"articleBody\":[\"...and so on.\"]}}");
     
    // work data
    Cloner cloner = new Cloner();
    Resource enhancedArticle = cloner.deepClone(originalArticle);
    Resource enhancedPerson = cloner.deepClone(originalPerson);
    
    // allow manipulation on nested "about" of article
    final Map<String, Object> articleAbout = (Map<String, Object>) enhancedArticle.get("about");
    // build ArrayList of Person's with 1 person and define person as creator of article...
    final List<Resource> creators = new LinkedList<>();
    creators.add(originalPerson);
    articleAbout.put("creator", creators);
    // ..and store that information back into the article
    enhancedArticle.put("about", articleAbout);
    
    // store articles in person vice versa
    final List<Resource> articles = new LinkedList<>();
    articles.add(Resource.getEmbedView(enhancedArticle));
    enhancedPerson.put("authorOf", articles);
    try {
      mRepo.addResource(Resource.getEmbedView(enhancedPerson));
      final Resource requestedArticle = mRepo.getResource("article00002");
      Assert.assertEquals(originalPerson, mRepo.getResource("person00003"));
      // since the article stored alongside the person was free from IDed information,
      // the about
      Assert.assertEquals(originalArticle, requestedArticle);
    } catch (IOException e) {
      e.printStackTrace();
    }
  }
}
